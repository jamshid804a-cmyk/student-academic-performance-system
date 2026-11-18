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
      } else if (
        typeof v === "string" &&
        /^[a-f0-9]{24}$/i.test(v) &&
        (k.endsWith("Id") || k.endsWith("_id"))
      ) {
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
    const schoolResult = await getCurrentSchool();
    if (!schoolResult.success) {
      return NextResponse.json(
        { error: schoolResult.error || "Unauthorized" },
        { status: 401 }
      );
    }
    const { schoolId } = schoolResult.school;

    const body = await request.json();
    const { data, schoolId: backupSchoolId } = body;

    if (!data || typeof data !== "object") {
      return NextResponse.json({ error: "Invalid backup file" }, { status: 400 });
    }

    // Safety: prevent restoring another school's backup
    if (backupSchoolId && backupSchoolId !== schoolId) {
      return NextResponse.json(
        {
          error: `This backup is for school "${backupSchoolId}", but you are logged in as "${schoolId}". Restore blocked for safety.`,
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

    let session;
    try {
      session = client.startSession();
    } catch {
      session = null;
    }

    const counts = {};

    async function doRestore(useSession) {
      for (const name of collectionNames) {
        const docs = data[name];
        if (!Array.isArray(docs)) continue;

        const coll = db.collection(name);

        // ⚠️ CRITICAL: Only delete THIS school's documents
        // Special case: "schools" and "school_info" store the school itself
        let deleteFilter;
        if (name === "schools" || name === "school_info") {
          deleteFilter = { $or: [{ schoolId }, { id: schoolId }] };
        } else if (name === "counters") {
          // Global counters — leave them alone
          continue;
        } else {
          deleteFilter = { schoolId };
        }

        await coll.deleteMany(deleteFilter, useSession ? { session } : {});

        // Re-insert this school's backup docs
        if (docs.length > 0) {
          const revived = reviveObjectIds(docs);
          // Ensure every doc is tagged with this schoolId (defensive)
          const tagged = revived.map((d) =>
            name === "schools" || name === "school_info"
              ? d
              : { ...d, schoolId }
          );
          await coll.insertMany(tagged, useSession ? { session } : {});
        }

        counts[name] = docs.length;
      }
    }

    let usedTransaction = false;

    if (session) {
      try {
        await session.withTransaction(async () => {
          await doRestore(true);
        });
        usedTransaction = true;
      } catch (txErr) {
        console.warn("Transaction failed, fallback:", txErr.message);
        for (const k of Object.keys(counts)) delete counts[k];
        await doRestore(false);
      } finally {
        await session.endSession();
      }
    } else {
      await doRestore(false);
    }

    return NextResponse.json({
      success: true,
      message: "Your school's data restored successfully",
      schoolId,
      usedTransaction,
      collectionsRestored: collectionNames.length,
      counts,
    });
  } catch (error) {
    console.error("Import failed:", error);
    return NextResponse.json(
      { error: "Import failed: " + error.message },
      { status: 500 }
    );
  }
}