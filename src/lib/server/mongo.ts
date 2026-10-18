// One cached MongoClient for the whole server process (a client per request exhausts Atlas connections).
import { MongoClient, type Db } from "mongodb";

const g = globalThis as unknown as { __mongo?: Promise<MongoClient>; __mongoIndexes?: Promise<void> };

export const hasMongo = () => !!process.env.MONGODB_URI;

export async function getDb(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  g.__mongo ??= new MongoClient(uri, { appName: "collabmatch", serverSelectionTimeoutMS: 8000, ignoreUndefined: true }).connect();
  const client = await g.__mongo.catch(err => { g.__mongo = undefined; throw err; });
  const db = client.db(process.env.MONGODB_DB ?? "collabmatch");
  g.__mongoIndexes ??= ensureIndexes(db).catch(err => { g.__mongoIndexes = undefined; throw err; });
  await g.__mongoIndexes;
  return db;
}

/** Indexes the MLH judges look for (spec 11.2). Safe to run repeatedly. */
export async function ensureIndexes(db: Db) {
  await Promise.all([
    db.collection("businesses").createIndex({ id: 1 }, { unique: true }),
    db.collection("creators").createIndex({ id: 1 }, { unique: true }),
    db.collection("creators").createIndex({ available: 1, niches: 1, serviceAreas: 1 }),
    db.collection("creators").createIndex({ handle: 1 }),
    db.collection("campaigns").createIndex({ id: 1 }, { unique: true }),
    db.collection("campaigns").createIndex({ businessId: 1, createdAt: -1 }),
    db.collection("collaborations").createIndex({ id: 1 }, { unique: true }),
    db.collection("collaborations").createIndex({ creatorId: 1 }),
    db.collection("collaborations").createIndex({ campaignId: 1 }),
    db.collection("collaborations").createIndex({ inviteToken: 1 }, { unique: true }),
    db.collection("oauthTokens").createIndex({ creatorId: 1 }, { unique: true })
  ]);
}
