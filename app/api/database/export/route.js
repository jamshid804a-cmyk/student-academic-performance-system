import { NextResponse } from "next/server";
import getClientPromise from "@/utils/mongodb";

export async function GET() {
  try {
    const client = await getClientPromise();
    const db = client.db("school_db");

    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name).sort();

    const data = {};
    const counts = {};

    for (const name of collectionNames) {
      const docs = await db.collection(name).find({}).toArray();
      data[name] = docs;
      counts[name] = docs.length;
    }

    return NextResponse.json({
      version: 4,
      exportedAt: new Date().toISOString(),
      dbType: "mongodb",
      database: "school_db",
      collections: collectionNames,
      counts,
      data,
    });
  } catch (error) {
    console.error("Export failed:", error);
    return NextResponse.json({ error: "Export failed: " + error.message }, { status: 500 });
  }
}
