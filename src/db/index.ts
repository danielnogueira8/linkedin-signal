import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type DB = NeonHttpDatabase<typeof schema>;

let _db: DB | null = null;

function createDb(): DB {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set — add your Neon connection string to .env.local");
  }
  return drizzle(neon(url), { schema });
}

// Lazy proxy: route modules can be imported at build time (page-data
// collection) without DATABASE_URL; the connection is created on first query.
export const db: DB = new Proxy({} as DB, {
  get(_target, prop) {
    const real = (_db ??= createDb());
    const value = Reflect.get(real, prop);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export * from "./schema";
