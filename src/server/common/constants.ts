import { z } from '@hono/zod-openapi';
import { getPrefix, IdPrefixKeys } from '@/server/lib/id';
import { createMessageObjectSchema } from 'stoker/openapi/schemas';
import * as HttpStatusPhrases from 'stoker/http-status-phrases';

export const notFoundSchema = createMessageObjectSchema(
  HttpStatusPhrases.NOT_FOUND
);

export const commonInsertOmitFields = {
  id: true,
  createdAt: true,
  updatedAt: true,
} as const;

export function createIdValidator(key: IdPrefixKeys) {
  const prefix = getPrefix(key);

  return z
    .string()
    .min(5)
    .startsWith(`${prefix}_`)
    .openapi({
      param: {
        name: 'id',
        in: 'path',
      },
    });
}

export function getIdParamsSchema(key: IdPrefixKeys) {
  return z.object({
    id: createIdValidator(key),
  });
}
