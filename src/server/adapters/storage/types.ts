/**
 * Storage adapter interface for file uploads.
 *
 * Implementations: local filesystem (default), Vercel Blob, S3-compatible, Cloudflare R2.
 * Add via `npx reforum add storage-s3` etc.
 */
export interface StorageAdapter {
  upload(
    file: Buffer,
    path: string,
    mimeType: string
  ): Promise<{ url: string; storagePath: string }>;

  delete(storagePath: string): Promise<void>;

  getUrl(storagePath: string): string;
}
