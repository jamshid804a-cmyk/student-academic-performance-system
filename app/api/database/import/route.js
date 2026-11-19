import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import getClientPromise from "@/utils/mongodb";
import { getCurrentSchool } from "@/utils/getCurrentSchool";

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
    // 1. Verify login
    const schoolResult = await getCurrentSchool();
    if (!schoolResult.success) {
      return NextResponse.json(
        { error: schoolResult.error || "Unauthorized" },
        { status: 401 }
      );
    }
    const { schoolId } = schoolResult.school;

    // 2. Parse request
    const body = await request.json();
    const { data, schoolId: backupSchoolId } = body;

    if (!data || typeof data !== "object") {
      return NextResponse.json({ error: "Invalid backup file" }, { status: 400 });
    }

    // 3. Safety check
    if (backupSchoolId && backupSchoolId !== schoolId) {
      return NextResponse.json(
        {
          error: `Backup is for "${backupSchoolId}", you're logged in as "${schoolId}"`,
        },
        { status: 403 }
      );
    }

    // 4. Pre-check: does backup actually have data?
    const backupStudentCount = data?.students?.length || 0;
    if (backupStudentCount === 0) {
      console.warn(`[import] WARNING: Backup has 0 students — nothing will be restored to students collection`);
    }

    const collectionNames = Object.keys(data);
    if (collectionNames.length === 0) {
      return NextResponse.json({ error: "Backup file is empty" }, { status: 400 });
    }

    console.log(`[import] Starting restore for schoolId=${schoolId}`);
    console.log(`[import] Backup has ${collectionNames.length} collections`);

    const client = await getClientPromise();
    const db = client.db("school_db");

    const counts = {};
    const errors = [];

    for (const name of collectionNames) {
      const docs = data[name];
      if (!Array.isArray(docs)) {
        counts[name] = 0;
        continue;
      }

      try {
        const coll = db.collection(name);

        // Decide delete filter
        let deleteFilter;
        if (name === "schools" || name === "school_info") {
          deleteFilter = { $or: [{ schoolId }, { id: schoolId }, { _id: schoolId }] };
        } else if (name === "counters" || name === "school_settings") {
          // Skip global/secret collections
          counts[name] = 0;
          continue;
        } else {
          deleteFilter = { schoolId };
        }

        // Delete
        const deleted = await coll.deleteMany(deleteFilter);
        console.log(`[import] ${name}: deleted ${deleted.deletedCount}`);

        // Insert
        if (docs.length > 0) {
          const revived = reviveObjectIds(docs);

          // Tag with schoolId
          const tagged = revived.map((d) => {
            if (name === "schools" || name === "school_info") return d;
            const out = { ...d, schoolId };
            // Default program for students
            if (name === "students" && !out.program) {
              out.program = "school";
            }
            return out;
          });

          // Insert with duplicate fallback
          try {
            const result = await coll.insertMany(tagged, { ordered: false });
            counts[name] = result.insertedCount;
            console.log(`[import] ${name}: inserted ${result.insertedCount}`);
          } catch (insertErr) {
            // Handle duplicate key errors
            if (insertErr.code === 11000 || insertErr.writeErrors) {
              let successCount = 0;
              for (const doc of tagged) {
                try {
                  await coll.insertOne(doc);
                  successCount++;
                } catch (e) {
                  if (e.code !== 11000) {
                    errors.push(`${name}: ${e.message}`);
                  }
                }
              }
              counts[name] = successCount;
              console.log(`[import] ${name}: inserted ${successCount}/${tagged.length}`);
            } else {
              throw insertErr;
            }
          }
        } else {
          counts[name] = 0;
          console.log(`[import] ${name}: backup had 0 docs`);
        }
      } catch (collErr) {
        console.error(`[import] ${name} FAILED:`, collErr.message);
        errors.push(`${name}: ${collErr.message}`);
        counts[name] = -1;
      }
    }

    // 5. Verify
    const finalStudentCount = await db
      .collection("students")
      .countDocuments({ schoolId });

    console.log(`[import] ✓ DONE. finalStudentCount=${finalStudentCount}`);
    console.log(`[import] counts:`, counts);

    const totalRestored = Object.values(counts)
      .filter((n) => n > 0)
      .reduce((a, b) => a + b, 0);

    return NextResponse.json({
      success: true,
      message: `Restored ${totalRestored} records`,
      schoolId,
      finalStudentCount,
      counts,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("[import] FATAL:", error);
    return NextResponse.json(
      { error: "Import failed: " + error.message },
      { status: 500 }
    );
  }
}