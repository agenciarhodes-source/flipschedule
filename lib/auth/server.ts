import "server-only";

import { randomUUID } from "node:crypto";

import { betterAuth } from "better-auth";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

import type { PrismaClient } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/client";
import { readAuthConfig } from "./config";
import { normalizeEmail } from "./utils";

export function createAuth(prisma?: PrismaClient) {
  const authConfig = readAuthConfig();
  const database = prisma ?? getPrismaClient();
  const generateAuthId = () => randomUUID();

  return betterAuth({
    appName: "FlipSchedule",
    baseURL: authConfig.baseURL!,
    secret: authConfig.secret!,
    trustedOrigins: authConfig.trustedOrigins,
    database: prismaAdapter(database, { provider: "postgresql" }),
    // An injected Prisma client is used only by bounded CLI rehearsals. Those
    // callers capture Set-Cookie headers directly and do not have a Next.js
    // request scope in which nextCookies() can operate.
    plugins: prisma ? [] : [nextCookies()],
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      autoSignIn: false,
      requireEmailVerification: false,
      password: {
        hash: async (password) => hashPassword(password),
        verify: async ({ hash, password }) => verifyPassword({ hash, password }),
      },
    },
    user: {
      modelName: "User",
      fields: {
        name: "displayName",
        email: "emailNormalized",
        emailVerified: "emailVerified",
      },
    },
    session: {
      modelName: "AuthSession",
      expiresIn: 60 * 60 * 24 * 14,
      updateAge: 60 * 60 * 24,
      storeSessionInDatabase: true,
      cookieCache: { enabled: false },
    },
    account: {
      modelName: "AuthAccount",
    },
    verification: {
      modelName: "AuthVerification",
    },
    advanced: {
      // Better Auth 1.2 reads generateId at this level. The nested option is
      // kept for forward compatibility with the current configuration shape.
      generateId: generateAuthId,
      useSecureCookies: authConfig.isSecureRuntime,
      database: {
        generateId: generateAuthId,
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => ({
            data: {
              ...user,
              email: normalizeEmail(user.email),
              emailVerified: false,
            },
          }),
        },
      },
    },
  });
}

let cachedAuth: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  cachedAuth ??= createAuth();
  return cachedAuth;
}

type Auth = ReturnType<typeof createAuth>;
export type AuthSession = Auth["$Infer"]["Session"];
export type AuthUser = AuthSession["user"];
