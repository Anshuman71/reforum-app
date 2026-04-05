import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import type { StorageAdapter } from './types';

interface LocalStorageOptions {
  dir?: string;
}

/**
 * Default storage adapter. Writes files to the local filesystem
 * under `public/uploads/` and serves them via Next.js static file serving.
 */
export function localStorageAdapter(
  options: LocalStorageOptions = {}
): StorageAdapter {
  const dir = options.dir ?? './public/uploads';

  return {
    async upload(file, path, _mimeType) {
      const fullPath = join(dir, path);
      const dirPath = fullPath.substring(0, fullPath.lastIndexOf('/'));
      await mkdir(dirPath, { recursive: true });
      await writeFile(fullPath, file);
      return {
        url: `/uploads/${path}`,
        storagePath: path,
      };
    },

    async delete(storagePath) {
      const fullPath = join(dir, storagePath);
      try {
        await unlink(fullPath);
      } catch {
        // File may not exist, ignore
      }
    },

    getUrl(storagePath) {
      return `/uploads/${storagePath}`;
    },
  };
}
