import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";

// Load .env.local manually (Node script isn't Next.js)
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI not found in .env.local");
  process.exit(1);
}

console.log("Connecting to MongoDB...");
const client = new MongoClient(uri);

try {
  await client.connect();
  const db = client.db("school_db");
  const colls = await db.listCollections().toArray();

  console.log("\nCollections in school_db:");
  console.log("-----------------------------");

  for (const c of colls.sort((a, b) => a.name.localeCompare(b.name))) {
    const count = await db.collection(c.name).countDocuments();
    console.log(`  ${c.name.padEnd(30)} (${count} docs)`);
  }

  console.log("-----------------------------");
  console.log(`Total: ${colls.length} collections\n`);
} catch (err) {
  console.error("Error:", err.message);
} finally {
  await client.close();
  process.exit(0);
}
