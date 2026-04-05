/* eslint-disable n/no-process-env */
import 'server-only';
import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import { z } from 'zod';

expand(config({ quiet: true }));

const EnvSchema = z.object({
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string(),
  BETTER_AUTH_URL: z.string(),
  ADMIN_EMAIL: z.email(),
});

export type env = z.infer<typeof EnvSchema>;

export function getEnvs() {
  const { data: env, error } = EnvSchema.safeParse(process.env);

  if (error) {
    console.error('Invalid env:');
    console.error(JSON.stringify(error.flatten().fieldErrors, null, 2));
    process.exit(1);
  }

  return env;
}
