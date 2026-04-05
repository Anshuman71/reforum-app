import { config } from 'dotenv';
config({
  path: '.env.local',
  quiet: true,
});
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: './src/server/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: String(process.env.DATABASE_URL),
  },
});
