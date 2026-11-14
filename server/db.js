import { MongoClient, GridFSBucket } from "mongodb";

export async function connectDatabase() {
  if (!process.env.MONGODB_URI) throw new Error("Set MONGODB_URI in .env.local before starting the server.");
  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  await client.connect();
  const db = client.db(process.env.MONGODB_DB_NAME || "ayush_crm");
  await db.command({ ping: 1 });
  return { client, db, bucket: new GridFSBucket(db, { bucketName: "media" }) };
}

export async function createIndexes(db) {
  await Promise.all([
    db.collection("admins").createIndex({ email: 1 }, { unique: true }),
    db.collection("sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection("sessions").createIndex({ token: 1 }, { unique: true }),
    db.collection("products").createIndex({ "draft.num": 1 }, { unique: true }),
    db.collection("products").createIndex({ "draft.categoryId": 1, "draft.slug": 1 }, { unique: true }),
    db.collection("categories").createIndex({ "draft.slug": 1 }, { unique: true }),
  ]);
}
