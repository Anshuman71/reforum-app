import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { PreparedUpload, StorageAdapter } from './types';

interface S3CompatibleStorageOptions {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl?: string;
  forcePathStyle?: boolean;
  expiresInSeconds?: number;
}

function createClient(options: S3CompatibleStorageOptions) {
  return new S3Client({
    endpoint: options.endpoint,
    region: options.region,
    forcePathStyle: options.forcePathStyle ?? false,
    credentials: {
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey,
    },
  });
}

function getPublicUrl(
  options: S3CompatibleStorageOptions,
  storagePath: string
) {
  if (options.publicBaseUrl) {
    return `${options.publicBaseUrl.replace(/\/$/, '')}/${storagePath}`;
  }

  const endpoint = new URL(options.endpoint);
  const basePath = endpoint.pathname.replace(/\/$/, '');

  if (options.forcePathStyle) {
    return `${endpoint.protocol}//${endpoint.host}${basePath}/${options.bucket}/${storagePath}`;
  }

  return `${endpoint.protocol}//${options.bucket}.${endpoint.host}${basePath}/${storagePath}`;
}

export function s3CompatibleStorageAdapter(
  options: S3CompatibleStorageOptions
): StorageAdapter {
  const client = createClient(options);
  const expiresIn = options.expiresInSeconds ?? 900;

  return {
    async prepareUpload({ storagePath, mimeType }) {
      const command = new PutObjectCommand({
        Bucket: options.bucket,
        Key: storagePath,
        ContentType: mimeType,
      });

      const uploadUrl = await getSignedUrl(client, command, {
        expiresIn,
      });

      const prepared: PreparedUpload = {
        strategy: 'presigned',
        uploadUrl,
        method: 'PUT',
        headers: {
          'content-type': mimeType,
        },
        publicUrl: getPublicUrl(options, storagePath),
        storagePath,
      };

      return prepared;
    },

    async upload(file, storagePath, mimeType) {
      await client.send(
        new PutObjectCommand({
          Bucket: options.bucket,
          Key: storagePath,
          Body: file,
          ContentType: mimeType,
        })
      );

      return {
        url: getPublicUrl(options, storagePath),
        storagePath,
      };
    },

    async delete(storagePath) {
      await client.send(
        new DeleteObjectCommand({
          Bucket: options.bucket,
          Key: storagePath,
        })
      );
    },

    getUrl(storagePath) {
      return getPublicUrl(options, storagePath);
    },
  };
}
