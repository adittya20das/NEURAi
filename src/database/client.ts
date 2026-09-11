import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
// The connection is only used by authenticated database operations. A local
// fallback keeps route discovery/builds independent from deployment secrets.
const url = process.env.DATABASE_URL ?? "postgresql://localhost:5432/neurai";
export const db = drizzle(postgres(url, { prepare: false }), { schema });
