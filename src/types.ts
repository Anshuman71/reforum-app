/* eslint-disable @typescript-eslint/no-explicit-any */
import type { RouteConfig, RouteHandler } from '@hono/zod-openapi';
import type { InferResponseType } from 'hono/client';
import { Session, User } from 'better-auth';
import { StatusCode } from 'hono/utils/http-status';

export type AppRouteHandler<R extends RouteConfig> = RouteHandler<
  R,
  { Variables: AuthedVariables }
>;
export type AuthedVariables = {
  user: (User & { role: 'user' | 'moderator' | 'admin' }) | null;
  session: Session | null;
};

// Infer the success response type (defaults to 200)
export type InferSuccessResponse<
  T extends (...args: any) => any,
  SuccessCode extends StatusCode = 200,
> = InferResponseType<T, SuccessCode>;

// Infer the union of all non-success response types
export type InferErrorResponse<T extends (...args: any) => any> =
  InferResponseType<T, Exclude<StatusCode, 200>>;
