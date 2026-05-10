import { writeFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import type { StorageAdapter } from "./types";

/**
 * Default storage adapter. Writes files to the local filesystem
 * under `public/uploads/` and serves them via Next.js static file serving.
 */
export function localStorageAdapter(): StorageAdapter {
  const dir = join(process.cwd(), "public", "uploads");

  return {
    async prepareUpload({ storagePath }) {
      return {
        strategy: 'server',
        uploadUrl: `/api/uploads/local?storagePath=${encodeURIComponent(storagePath)}`,
        method: 'POST',
        publicUrl: `/uploads/${storagePath}`,
        storagePath,
      };
    },

    async upload(file, path, _mimeType) {
      const fullPath = join(dir, path);
      const dirPath = fullPath.substring(0, fullPath.lastIndexOf("/"));
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
