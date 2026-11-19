import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import getClientPromise from "@/utils/mongodb";
import { getCurrentSchool } from "@/utils/getCurrentSchool";

// Convert JSON strings back to ObjectId where appropriate
function reviveObjectIds(value) {
  if (Array.isArray(value)) return value.map(reviveObjectIds);
  if (value && typeof value === "object") {
    if (value._bsontype === "ObjectId") return value;
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === "_id" && typeof v === "string" && /^[a-f0-9]{24}$/i.test(v)) {
        out[k] = new ObjectId(v);
      } else if (typeof v === "object" && v !== null && v.$oid) {
        out[k] = new ObjectId(v.$oid);
      } else if (typeof v === "object" && v !== null && v.$date) {
        out[k] = new Date(v.$date);
      } else {
        out[k] = reviveObjectIds(v);
      }
    }
    return out;
  }
  return value;
}

export async function POST(request) {
  try {
    // 1. Auth check
    const schoolResult = await getCurrentSchool();
    if (!schoolResult.success) {
      return NextResponse.json(
        { error: schoolResult.error || "Unauthorized" },
        { status: 401 }
      );
    }
    const { schoolId } = schoolResult.school;

    // 2. Parse body
    const body = await request.json();
    const { data, schoolId: backupSchoolId } = body;

    console.log(`[import] === START ===`);
    console.log(`[import] logged in as: ${schoolId}`);
    console.log(`[import] backup is for: ${backupSchoolId}`);

    if (!data || typeof data !== "object") {
      return NextResponse.json({ error: "Invalid backup file" }, { status: 400 });
    }

    if (backupSchoolId && backupSchoolId !== schoolId) {
      return NextResponse.json(
        { error: `Backup is for "${backupSchoolId}", you're logged in as "${schoolId}"` },
        { status: 403 }
      );
    }

    const client = await getClientPromise();
    const db = client.db("school_db");

    const counts = {};
    const errors = [];
    const details = [];

    // 3. Process each collection
    for (const name of Object.keys(data)) {
      const docs = data[name];
      if (!Array.isArray(docs)) {
        details.push(`${name}: skipped (not array)`);
        counts[name] = 0;
        continue;
      }

      try {
        const coll = db.collection(name);

        // Delete only THIS school's docs (except globals)
        let deleteFilter;
        if (name === "schools" || name === "school_info") {
          deleteFilter = { $or: [{ schoolId }, { id: schoolId }, { _id: schoolId }] };
        } else if (name === "counters" || name === "school_settings") {
          details.push(`${name}: skipped (global)`);
          counts[name] = 0;
          continue;
        } else {
          deleteFilter = { schoolId };
        }

        const deleted = await coll.deleteMany(deleteFilter);
        details.push(`${name}: deleted ${deleted.deletedCount}`);

        // Insert
        if (docs.length > 0) {
          const revived = reviveObjectIds(docs);

          // Force schoolId on every doc (except schools/school_info)
          const tagged = revived.map((d) => {
            if (name === "schools" || name === "school_info") return d;
            const out = { ...d, schoolId };
            if (name === "students" && !out.program) out.program = "school";
            return out;
          });

          try {
            const result = await coll.insertMany(tagged, { ordered: false });
            counts[name] = result.insertedCount;
            details.push(`${name}: inserted ${result.insertedCount}/${tagged.length}`);
          } catch (insertErr) {
            // Handle duplicates
            if (insertErr.code === 11000 || insertErr.writeErrors) {
              let ok = 0;
              for (const doc of tagged) {
                try {
                  await coll.insertOne(doc);
                  ok++;
                } catch (e) {
                  if (e.code !== 11000) {
                    errors.push(`${name}: ${e.message}`);
                  }
                }
              }
              counts[name] = ok;
              details.push(`${name}: inserted ${ok}/${tagged.length} (dupes skipped)`);
            } else {
              throw insertErr;
            }
          }
        } else {
          counts[name] = 0;
          details.push(`${name}: 0 docs in backup`);
        }
      } catch (collErr) {
        console.error(`[import] ${name} FAILED:`, collErr.message);
        errors.push(`${name}: ${collErr.message}`);
        counts[name] = -1;
        details.push(`${name}: ERROR - ${collErr.message}`);
      }
    }

    // 4. Verify
    const finalStudentCount = await db
      .collection("students")
      .countDocuments({ schoolId });

    const verifyStudents = await db
      .collection("students")
      .find({ schoolId })
      .toArray();

    console.log(`[import] === DONE ===`);
    console.log(`[import] students in DB now: ${finalStudentCount}`);

    return NextResponse.json({
      success: true,
      message: `Restored ${counts.students || 0} students to ${schoolId}`,
      schoolId,
      finalStudentCount,
      counts,
      errors: errors.length > 0 ? errors : undefined,
      details,
      restoredStudents: verifyStudents.map((s) => ({
        id: s.id,
        name: s.name,
        schoolId: s.schoolId,
        program: s.program,
      })),
    });
  } catch (error) {
    console.error("[import] FATAL:", error);
    return NextResponse.json(
      { error: "Import failed: " + error.message, stack: error.stack },
      { status: 500 }
    );
  }
}