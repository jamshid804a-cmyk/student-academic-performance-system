import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import getClientPromise from "@/lib/mongodb";

// Recursively revive ObjectId strings back to ObjectId instances
function reviveObjectIds(value) {
  if (Array.isArray(value)) return value.map(reviveObjectIds);

  if (value && typeof value === "object") {
    // If it's already an ObjectId-shaped object from JSON, skip
    if (value._bsontype === "ObjectId") return value;

    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (
        k === "_id" &&
        typeof v === "string" &&
        /^[a-f0-9]{24}$/i.test(v)
      ) {
        out[k] = new ObjectId(v);
      } else if (
        typeof v === "string" &&
        /^[a-f0-9]{24}$/i.test(v) &&
        (k.endsWith("Id") || k.endsWith("_id") || k.endsWith("IDs"))
      ) {
        out[k] = new ObjectId(v);
      } else if (
        typeof v === "object" &&
        v !== null &&
        v.$oid &&
        typeof v.$oid === "string"
      ) {
        // Extended JSON format: { "$oid": "..." }
        out[k] = new ObjectId(v.$oid);
      } else if (
        typeof v === "object" &&
        v !== null &&
        v.$date
      ) {
        // Extended JSON date
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
    const body = await request.json();
    const { data } = body;

    if (!data || typeof data !== "object") {
      return NextResponse.json(
        { error: "Invalid backup file — missing data object" },
        { status: 400 }
      );
    }

    const collectionNames = Object.keys(data);
    if (collectionNames.length === 0) {
      return NextResponse.json(
        { error: "Backup file has no collections to restore" },
        { status: 400 }
      );
    }

    const client = await getClientPromise();
    const db = client.db("school_db");

    // Try transaction (works on Atlas replica set). If it fails, fall back to non-transactional.
    let session;
    try {
      session = client.startSession();
    } catch (e) {
      session = null;
    }

    const counts = {};

    async function doRestore(useSession) {
      for (const name of collectionNames) {
        const docs = data[name];
        if (!Array.isArray(docs)) continue;

        const coll = db.collection(name);

        // Wipe existing collection
        await coll.deleteMany({}, useSession ? { session } : {});

        // Re-insert from backup with revived ObjectIds
        if (docs.length > 0) {
          const revived = reviveObjectIds(docs);
          await coll.insertMany(revived, useSession ? { session } : {});
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
        console.warn(
          "Transaction failed, falling back to non-transactional restore:",
          txErr.message
        );
        // Reset counts because transaction may have partially run
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
      message: "Database restored successfully",
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