// Import env defaults FIRST — must run before MongoClient is constructed.
import "@/lib/env";
import { MongoClient, Db } from "mongodb";

/**
 * MongoDB connection for price-history caching.
 *
 * MONGODB_URI is loaded from env vars (hosting platform) OR from the
 * hardcoded fallback in src/lib/env.ts — whichever is set first.
 */
const uri = process.env.MONGODB_URI;
const dbName = "blockexchange";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function getMongoDb(): Promise<Db> {
  if (db) return db;
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Neither the hosting platform nor src/lib/env.ts provided a value."
    );
  }
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
  }
  db = client.db(dbName);
  return db;
}
