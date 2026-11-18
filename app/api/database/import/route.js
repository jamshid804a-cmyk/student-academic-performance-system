import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import getClientPromise from "@/utils/mongodb";
import { getCurrentSchool } from "@/utils/getCurrentSchool";

// Convert JSON _id strings back to ObjectId
function reviveObjectIds(value) {
  if (Array.isArray(value)) return value.map(reviveObjectIds);
  if (value && typeof value === "object") {
    if (value._bsontype === "ObjectId") return value;
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === "_id" && typeof v === "string" && /^[a-f0-9]{24}$/i.test(v)) {
        out[k] = new ObjectId(v);
      } else if (
        typeof v === "string" &&
        /^[a-f0-9]{24}$/i.test(v) &&
        (k.endsWith("Id") || k.endsWith("_id")) &&
        k !== "studentId" && k !== "teacherId" && k !== "schoolId"
      ) {
        // Only revive actual ObjectId refs — not string IDs like "studentId"
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
    // 1. Verify logged-in user
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

    // 3. Safety: prevent restoring another school's backup
    if (backupSchoolId && backupSchoolId !== schoolId) {
      return NextResponse.json(
        {
          error: `This backup is for school "${backupSchoolId}" but you're logged in as "${schoolId}". Restore blocked.`,
        },
        { status: 403 }
      );
    }

    const collectionNames = Object.keys(data);
    if (collectionNames.length === 0) {
      return NextResponse.json({ error: "Backup file is empty" }, { status: 400 });
    }

    const client = await getClientPromise();
    const db = client.db("school_db");

    const counts = {};
    const errors = [];

    // 4. Restore each collection — NO transaction to avoid Atlas replica set issues
    for (const name of collectionNames) {
      const docs = data[name];
      if (!Array.isArray(docs)) {
        counts[name] = 0;
        continue;
      }

      try {
        const coll = db.collection(name);

        // ────── Delete only THIS school's documents ──────
        let deleteFilter;
        if (name === "schools" || name === "school_info") {
          deleteFilter = { $or: [{ schoolId }, { id: schoolId }, { _id: schoolId }] };
        } else if (name === "counters") {
          // Global counters — skip delete and skip insert (leave existing)
          counts[name] = 0;
          continue;
        } else if (name === "school_settings") {
          // Don't touch password settings on restore
          counts[name] = 0;
          continue;
        } else {
          deleteFilter = { schoolId };
        }

        const deleted = await coll.deleteMany(deleteFilter);
        console.log(`[import] ${name}: deleted ${deleted.deletedCount} docs for schoolId=${schoolId}`);

        // ────── Insert backup documents ──────
        if (docs.length > 0) {
          const revived = reviveObjectIds(docs);

          // Ensure every doc carries the correct schoolId (defensive)
          const tagged = revived.map((d) => {
            if (name === "schools" || name === "school_info") return d;
            return { ...d, schoolId };
          });

          try {
            const inserted = await coll.insertMany(tagged, { ordered: false });
            counts[name] = inserted.insertedCount;
            console.log(`[import] ${name}: inserted ${inserted.insertedCount} docs`);
          } catch (insertErr) {
            // Handle duplicate key errors: insert one by one to skip failures
            if (insertErr.code === 11000 || insertErr.writeErrors) {
              let successCount = 0;
              for (const doc of tagged) {
                try {
                  await coll.insertOne(doc);
                  successCount++;
                } catch (e) {
                  if (e.code !== 11000) errors.push(`${name}: ${e.message}`);
                }
              }
              counts[name] = successCount;
              console.log(`[import] ${name}: inserted ${successCount}/${tagged.length} (duplicates skipped)`);
            } else {
              throw insertErr;
            }
          }
        } else {
          counts[name] = 0;
        }
      } catch (collErr) {
        console.error(`[import] ${name} failed:`, collErr.message);
        errors.push(`${name}: ${collErr.message}`);
        counts[name] = -1; // -1 = error
      }
    }

    // 5. Verify student count
    const finalStudentCount = await db
      .collection("students")
      .countDocuments({ schoolId });

    console.log(`[import] ✓ DONE. Students for ${schoolId}: ${finalStudentCount}`);
    console.log(`[import] Counts:`, counts);

    const totalRestored = Object.values(counts)
      .filter((n) => n > 0)
      .reduce((a, b) => a + b, 0);

    return NextResponse.json({
      success: true,
      message: `Restored ${totalRestored} records for school ${schoolId}`,
      schoolId,
      finalStudentCount,
      collectionsRestored: collectionNames.length,
      counts,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Import failed:", error);
    return NextResponse.json(
      { error: "Import failed: " + error.message },
      { status: 500 }
    );
  }
}