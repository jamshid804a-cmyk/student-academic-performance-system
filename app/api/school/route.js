import { NextResponse } from "next/server";
import { getDb } from "@/utils";

// ✅ GET — fetch school info (single document)
export async function GET() {
  try {
    const db = await getDb();
    const info = await db.collection("school_info").findOne({ _id: "main" });

    if (!info) {
      return NextResponse.json({
        name: "SAPSYSYSTEM",
        address: "",
        principal: "",
        email: "",
        contact: "",
        logo: "",
      });
    }

    return NextResponse.json({
      name: info.name || "",
      address: info.address || "",
      principal: info.principal || "",
      email: info.email || "",
      contact: info.contact || "",
      logo: info.logo || "",
    });
  } catch (err) {
    console.error("❌ GET /api/school:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ✅ POST — save/update school info
export async function POST(req) {
  try {
    const data = await req.json();
    const db = await getDb();

    await db.collection("school_info").updateOne(
      { _id: "main" },
      {
        $set: {
          name: data.name || "",
          address: data.address || "",
          principal: data.principal || "",
          email: data.email || "",
          contact: data.contact || "",
          logo: data.logo || "",
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ POST /api/school:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}