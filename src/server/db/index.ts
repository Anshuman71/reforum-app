import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = String(process.env.DATABASE_URL);

// prepare: false is required when using connection poolers (e.g., PgBouncer, Supabase pooler)
// It's safe to leave enabled for direct connections too
const dbClient = postgres(connectionString, { prepare: false });
const db = drizzle(dbClient, { schema });

export { dbClient as client, db };
