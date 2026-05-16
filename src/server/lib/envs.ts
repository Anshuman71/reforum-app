/* eslint-disable n/no-process-env */
import "server-only";
import { config } from "dotenv";
import { expand } from "dotenv-expand";
import { z } from "zod";

expand(config({ quiet: true }));

const EnvSchema = z.object({
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string(),
  ADMIN_EMAIL: z.email(),
  NEXT_PUBLIC_BETTER_AUTH_URL: z.string(),
  EMAIL_PROVIDER: z.enum(["noop", "resend"]).optional(),
});

export type env = z.infer<typeof EnvSchema>;

const S3EnvSchema = z.object({
  S3_ENDPOINT: z.string(),
  S3_REGION: z.string().optional(),
  S3_BUCKET: z.string(),
  S3_ACCESS_KEY_ID: z.string(),
  S3_SECRET_ACCESS_KEY: z.string(),
  S3_PUBLIC_BASE_URL: z.string().optional(),
  S3_FORCE_PATH_STYLE: z.enum(["true", "false"]).optional(),
});

export type S3Env = z.infer<typeof S3EnvSchema>;

const ResendEmailEnvSchema = z.object({
  RESEND_API_KEY: z.string(),
  EMAIL_FROM: z.string(),
});

export type ResendEmailEnv = z.infer<typeof ResendEmailEnvSchema>;

export function getEnvs() {
  const { data: env, error } = EnvSchema.safeParse(process.env);

  if (error) {
    console.error("Invalid env:");
    console.error(JSON.stringify(error.flatten().fieldErrors, null, 2));
    process.exit(1);
  }

  return env;
}

export function getS3Envs() {
  const { data: env, error } = S3EnvSchema.safeParse(process.env);

  if (error) {
    console.error("Invalid S3 env:");
    console.error(JSON.stringify(error.flatten().fieldErrors, null, 2));
    process.exit(1);
  }

  return env;
}

export function getResendEmailEnvs() {
  const { data: env, error } = ResendEmailEnvSchema.safeParse(process.env);

  if (error) {
    console.error("Invalid Resend email env:");
    console.error(JSON.stringify(error.flatten().fieldErrors, null, 2));
    process.exit(1);
  }

  return env;
}
