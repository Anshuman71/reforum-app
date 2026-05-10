/**
 * Storage adapter interface for file uploads.
 *
 * Implementations: local filesystem (default), Vercel Blob, S3-compatible, Cloudflare R2.
 * Add via `npx reforum add storage-s3` etc.
 */
export interface PreparedUpload {
  strategy: 'presigned' | 'server';
  uploadUrl: string;
  method: 'PUT' | 'POST';
  headers?: Record<string, string>;
  publicUrl: string;
  storagePath: string;
}

export interface StorageAdapter {
  prepareUpload(params: {
    filename: string;
    storagePath: string;
    mimeType: string;
    size: number;
  }): Promise<PreparedUpload>;

  upload(
    file: Buffer,
    storagePath: string,
    mimeType: string
  ): Promise<{ url: string; storagePath: string }>;

  delete(storagePath: string): Promise<void>;

  getUrl(storagePath: string): string;
}
