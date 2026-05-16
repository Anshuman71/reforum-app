import "@/server/init";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/server/db";
import { newId } from "@/server/lib/id";
import { emitAfterEvent } from "@/server/lib/events";
import { getEnvs } from "@/server/lib/envs";
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "@/server/adapters/email/auth";
import { rateLimits } from "../db/schema";
getEnvs();

export const auth = betterAuth({
  rateLimit: {
    storage: "database",
  },
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      void sendPasswordResetEmail({ user, url }).catch((error) => {
        console.error("Failed to send password reset email:", error);
      });
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      void sendVerificationEmail({ user, url }).catch((error) => {
        console.error("Failed to send verification email:", error);
      });
    },
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
  }),
  advanced: {
    cookiePrefix: "reforum",
    database: {
      generateId: (options: { model: string; size?: number }) => {
        return newId(options.model as any);
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Thin bridge: emit event, all logic lives in feature registrations
          emitAfterEvent("user:afterSignup", {
            user: user as any,
            actor: { id: user.id, role: "user" },
            meta: {},
          });
        },
      },
    },
  },
  plugins: [nextCookies()],
});
