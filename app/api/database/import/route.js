import { NextResponse } from "next/server";
import { ObjectId, BSON } from "mongodb";
import getClientPromise from "@/utils/mongodb";
import { getCurrentSchool } from "@/utils/getCurrentSchool";

// If `BSON.EJSON` is undefined on your driver version, run `npm i bson`
// and use: import { EJSON } from "bson";
const { EJSON } = BSON;

// Keep these lists identical to the export route.
const SCHOOL_SCOPED = [
  "students",
  "teachers",
  "attendance",
  "teacher_attendance",
  "fees",
  "fee",
  "payments",
  "exams",
  "tests",
  "subjects",
  "parents",
  "notifications",
  "academy_courses",
];
const SCHOOL_OWN = ["schools", "school_info"];

const HEX24 = /^[a-f0-9]{24}$/i;

export async function POST(request) {
  try {
    // 1. Auth
    const schoolResult = await getCurrentSchool();
    if (!schoolResult.success) {
      return NextResponse.json(
        { error: schoolResult.error || "Unauthorized" },
        { status: 401 }
      );
    }
    const { schoolId } = schoolResult.school;

    // 2. Parse body.
    //    The settings page sends the WHOLE backup file as `body.data`,
    //    so the collections are at `body.data.data`. Accept both shapes.
    const body = await request.json();
    const backup = body?.data;

    if (!backup || typeof backup !== "object") {
      return NextResponse.json({ error: "Invalid backup file" }, { status: 400 });
    }

    const inner = backup.data;
    const collections =
      inner && typeof inner === "object" && !Array.isArray(inner) ? inner : backup;

    const backupSchoolId = body.schoolId || backup.schoolId;
    if (backupSchoolId && backupSchoolId !== schoolId) {
      return NextResponse.json(
        { error: `Backup is for "${backupSchoolId}", you're logged in as "${schoolId}"` },
        { status: 403 }
      );
    }

    const isEjson = backup.format === "ejson";

    const client = await getClientPromise();
    const db = client.db("school_db");

    const counts = {};
    const errors = [];
    const details = [];

    // 3. Only whitelisted collections are ever touched
    for (const name of [...SCHOOL_SCOPED, ...SCHOOL_OWN]) {
      const raw = collections[name];
      if (raw === undefined) continue; // not in this backup
      if (!Array.isArray(raw)) {
        details.push(`${name}: skipped (not an array)`);
        counts[name] = 0;
        continue;
      }

      try {
        const isOwn = SCHOOL_OWN.includes(name);

        // Restore real ObjectId / Date types
        let docs = EJSON.deserialize(raw, { relaxed: true });

        // Backups made by the OLD export have no type info:
        // convert string _id values back to ObjectId.
        if (!isEjson) {
          docs = docs.map((d) =>
            typeof d._id === "string" && HEX24.test(d._id)
              ? { ...d, _id: new ObjectId(d._id) }
              : d
          );
        }

        // Tag / validate ownership
        const prepared = [];
        for (const d of docs) {
          if (isOwn) {
            const mine =
              d.schoolId === schoolId || d.id === schoolId || String(d._id) === schoolId;
            if (!mine) continue; // never touch another school's record
            prepared.push(d);
          } else {
            const out = { ...d, schoolId };
            if (name === "students" && !out.program) out.program = "school";
            prepared.push(out);
          }
        }

        const coll = db.collection(name);

        // 4. Upsert every backup doc (matched on _id AND schoolId, so another
        //    school's document with the same _id is never overwritten).
        let written = 0;
        let writeFailed = false;

        if (prepared.length > 0) {
          const ops = prepared.map((d) =>
            d._id !== undefined
              ? {
                  replaceOne: {
                    filter: isOwn ? { _id: d._id } : { _id: d._id, schoolId },
                    replacement: d,
                    upsert: true,
                  },
                }
              : { insertOne: { document: d } }
          );

          try {
            await coll.bulkWrite(ops, { ordered: false });
            written = prepared.length;
          } catch (bulkErr) {
            const wErrs = bulkErr.writeErrors || [];
            writeFailed = true;
            written = prepared.length - wErrs.length;
            wErrs.slice(0, 5).forEach((we) => {
              const code = we.code ?? we.err?.code;
              const msg = we.errmsg || we.err?.errmsg || we.message || "write error";
              errors.push(`${name}: ${code === 11000 ? "duplicate key — " : ""}${msg}`);
            });
            if (wErrs.length === 0) errors.push(`${name}: ${bulkErr.message}`);
          }
        }

        counts[name] = written;
        details.push(`${name}: restored ${written}/${prepared.length}`);

        // 5. Remove this school's docs that were NOT in the backup
        //    (i.e. students added after the backup). Only when every write
        //    succeeded and the backup is non-empty, so a partial failure or an
        //    empty export can never wipe data.
        if (!isOwn) {
          if (writeFailed) {
            details.push(`${name}: cleanup skipped (some writes failed)`);
          } else if (prepared.length === 0) {
            details.push(`${name}: cleanup skipped (backup had 0 docs)`);
          } else {
            const keepIds = prepared.map((d) => d._id).filter((v) => v !== undefined);
            const del = await coll.deleteMany({ schoolId, _id: { $nin: keepIds } });
            details.push(`${name}: removed ${del.deletedCount} not in backup`);
          }
        }
      } catch (collErr) {
        console.error(`[import] ${name} FAILED:`, collErr);
        errors.push(`${name}: ${collErr.message}`);
        counts[name] = 0;
        details.push(`${name}: ERROR - ${collErr.message}`);
      }
    }

    // 6. Verify
    const finalStudentCount = await db.collection("students").countDocuments({ schoolId });

    return NextResponse.json({
      success: errors.length === 0,
      message: `Restored ${counts.students || 0} students to ${schoolId}`,
      schoolId,
      finalStudentCount,
      counts,
      errors: errors.length > 0 ? errors : undefined,
      details,
    });
  } catch (error) {
    console.error("[import] FATAL:", error);
    return NextResponse.json({ error: "Import failed: " + error.message }, { status: 500 });
  }
}