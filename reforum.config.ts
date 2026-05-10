import { defineConfig } from "@/server/lib/config";
import { pollingAdapter } from "@/server/adapters/realtime/polling";
import { s3CompatibleStorageAdapter } from "@/server/adapters/storage/s3";
import { consoleAnalytics } from "@/server/adapters/analytics/console";
import { noopEmailAdapter } from "@/server/adapters/email/noop";
import { getEnvs, getS3Envs } from "@/server/lib/envs";

getEnvs();
const s3Envs = getS3Envs();

const storage = s3CompatibleStorageAdapter({
  endpoint: s3Envs.S3_ENDPOINT,
  region: s3Envs.S3_REGION ?? "auto",
  bucket: s3Envs.S3_BUCKET,
  accessKeyId: s3Envs.S3_ACCESS_KEY_ID,
  secretAccessKey: s3Envs.S3_SECRET_ACCESS_KEY,
  publicBaseUrl: s3Envs.S3_PUBLIC_BASE_URL,
  forcePathStyle: s3Envs.S3_FORCE_PATH_STYLE === "true",
});

export default defineConfig({
  realtime: pollingAdapter(),
  storage,
  analytics: consoleAnalytics(),
  email: noopEmailAdapter(),
});
