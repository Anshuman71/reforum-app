import type { Context } from "hono";
import type { AppRouteHandler, AuthedVariables } from "@/types";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { ReforumApiError } from "@/server/errors";
import { getStorage } from "@/server/lib/config";
import { db } from "@/server/db";
import { uploads, users } from "@/server/db/schema";
import { newId } from "@/server/lib/id";
import { eq } from "drizzle-orm";
import { createHash } from "node:crypto";
import type {
  CompleteAvatarUploadRoute,
  CompleteContentImageUploadRoute,
  PrepareAvatarUploadRoute,
  PrepareContentImageUploadRoute,
} from "./uploads.routes";

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MAX_CONTENT_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_CONTENT_IMAGE_TYPES = ALLOWED_AVATAR_TYPES;

function assertAuthenticated(user: { id: string } | null): { id: string } {
  if (!user) {
    throw new ReforumApiError({
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }

  return user;
}

function assertAvatarInput(mimeType: string, size: number) {
  if (!ALLOWED_AVATAR_TYPES.has(mimeType)) {
    throw new ReforumApiError({
      code: "BAD_REQUEST",
      message: "Unsupported avatar file type",
    });
  }

  if (size > MAX_AVATAR_SIZE) {
    throw new ReforumApiError({
      code: "BAD_REQUEST",
      message: "Avatar file size exceeds the 5MB limit",
    });
  }
}

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function hashFilename(filename: string) {
  return createHash("sha256")
    .update(filename.trim().toLowerCase())
    .digest("hex")
    .slice(0, 16);
}

function buildStorageObjectName(filename: string, mimeType: string) {
  const uploadId = newId("upload");
  const filenameHash = hashFilename(filename);
  const extension = MIME_EXTENSIONS[mimeType];

  return `${uploadId}-${filenameHash}.${extension}`;
}

function buildAvatarStoragePath(
  userId: string,
  filename: string,
  mimeType: string,
) {
  return `avatars/${userId}/${buildStorageObjectName(filename, mimeType)}`;
}

function buildContentImageStoragePath(
  userId: string,
  filename: string,
  mimeType: string,
) {
  return `content/${userId}/${buildStorageObjectName(filename, mimeType)}`;
}

function assertAvatarStoragePath(userId: string, storagePath: string) {
  const allowedPrefix = `avatars/${userId}/`;

  if (!storagePath.startsWith(allowedPrefix)) {
    throw new ReforumApiError({
      code: "FORBIDDEN",
      message: "Invalid avatar storage path",
    });
  }
}

function assertContentImageInput(mimeType: string, size: number) {
  if (!ALLOWED_CONTENT_IMAGE_TYPES.has(mimeType)) {
    throw new ReforumApiError({
      code: "BAD_REQUEST",
      message: "Unsupported content image file type",
    });
  }

  if (size > MAX_CONTENT_IMAGE_SIZE) {
    throw new ReforumApiError({
      code: "BAD_REQUEST",
      message: "Content image file size exceeds the 5MB limit",
    });
  }
}

function assertContentImageStoragePath(userId: string, storagePath: string) {
  const allowedPrefix = `content/${userId}/`;

  if (!storagePath.startsWith(allowedPrefix)) {
    throw new ReforumApiError({
      code: "FORBIDDEN",
      message: "Invalid content image storage path",
    });
  }
}

export const prepareAvatarUpload: AppRouteHandler<
  PrepareAvatarUploadRoute
> = async (c) => {
  const user = assertAuthenticated(c.get("user"));
  const payload = c.req.valid("json");

  assertAvatarInput(payload.mimeType, payload.size);

  const storagePath = buildAvatarStoragePath(
    user.id,
    payload.filename,
    payload.mimeType,
  );
  const target = await getStorage().prepareUpload({
    filename: payload.filename,
    storagePath,
    mimeType: payload.mimeType,
    size: payload.size,
  });

  return c.json(target, HttpStatusCodes.OK);
};

export const completeAvatarUpload: AppRouteHandler<
  CompleteAvatarUploadRoute
> = async (c) => {
  const user = assertAuthenticated(c.get("user"));
  const payload = c.req.valid("json");

  assertAvatarInput(payload.mimeType, payload.size);
  assertAvatarStoragePath(user.id, payload.storagePath);

  const imageUrl = getStorage().getUrl(payload.storagePath);
  const uploadId = newId("upload");

  await db.transaction(async (tx) => {
    await tx.insert(uploads).values({
      id: uploadId,
      userId: user.id,
      filename: payload.filename,
      mimeType: payload.mimeType,
      size: payload.size,
      storagePath: payload.storagePath,
    });

    await tx
      .update(users)
      .set({ image: imageUrl, updatedAt: new Date() })
      .where(eq(users.id, user.id));
  });

  return c.json(
    {
      uploadId,
      imageUrl,
      storagePath: payload.storagePath,
    },
    HttpStatusCodes.OK,
  );
};

export const prepareContentImageUpload: AppRouteHandler<
  PrepareContentImageUploadRoute
> = async (c) => {
  const user = assertAuthenticated(c.get("user"));
  const payload = c.req.valid("json");

  assertContentImageInput(payload.mimeType, payload.size);

  const storagePath = buildContentImageStoragePath(
    user.id,
    payload.filename,
    payload.mimeType,
  );
  const target = await getStorage().prepareUpload({
    filename: payload.filename,
    storagePath,
    mimeType: payload.mimeType,
    size: payload.size,
  });

  return c.json(target, HttpStatusCodes.OK);
};

export const completeContentImageUpload: AppRouteHandler<
  CompleteContentImageUploadRoute
> = async (c) => {
  const user = assertAuthenticated(c.get("user"));
  const payload = c.req.valid("json");

  assertContentImageInput(payload.mimeType, payload.size);
  assertContentImageStoragePath(user.id, payload.storagePath);

  const imageUrl = getStorage().getUrl(payload.storagePath);
  const uploadId = newId("upload");

  await db.insert(uploads).values({
    id: uploadId,
    userId: user.id,
    filename: payload.filename,
    mimeType: payload.mimeType,
    size: payload.size,
    storagePath: payload.storagePath,
  });

  return c.json(
    {
      uploadId,
      imageUrl,
      storagePath: payload.storagePath,
    },
    HttpStatusCodes.OK,
  );
};

export async function uploadLocal(c: Context<{ Variables: AuthedVariables }>) {
  const user = assertAuthenticated(c.get("user"));
  const storagePath = c.req.query("storagePath");

  if (!storagePath) {
    throw new ReforumApiError({
      code: "BAD_REQUEST",
      message: "Missing storagePath query parameter",
    });
  }

  const formData = await c.req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    throw new ReforumApiError({
      code: "BAD_REQUEST",
      message: "Missing file upload",
    });
  }

  if (storagePath.startsWith(`avatars/${user.id}/`)) {
    assertAvatarStoragePath(user.id, storagePath);
    assertAvatarInput(file.type, file.size);
  } else if (storagePath.startsWith(`content/${user.id}/`)) {
    assertContentImageStoragePath(user.id, storagePath);
    assertContentImageInput(file.type, file.size);
  } else {
    throw new ReforumApiError({
      code: "FORBIDDEN",
      message: "Invalid upload storage path",
    });
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await getStorage().upload(buffer, storagePath, file.type);

  return c.json(result, HttpStatusCodes.OK);
}
