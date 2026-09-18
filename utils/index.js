import getClientPromise from "./mongodb";

export async function getDb() {
  const client = await getClientPromise();
  return client.db("school_db");
}