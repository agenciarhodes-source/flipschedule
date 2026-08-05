import "server-only";

import { randomUUID } from "node:crypto";

import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

import type { PrismaClient } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/client";
import { readAuthConfig } from "./config";
import { deliverAccountEmailVerification } from "./email-verification/delivery";
import { persistEmailVerifiedAt } from "./email-verification/state";
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
    plugins: prisma ? [] : [nextCookies()],
    emailVerification: {
      expiresIn: 60 * 60,
      sendOnSignUp: false,
      autoSignInAfterVerification: false,
      sendVerificationEmail: async ({ user, url, token }) => {
        await deliverAccountEmailVerification({
          recipientEmail: user.email,
          verificationUrl: url,
          token,
        });
      },
    },
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
      generateId: generateAuthId,
      useSecureCookies: authConfig.isSecureRuntime,
      database: {
        generateId: generateAuthId,
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/send-verification-email") return;

        const session = await getSessionFromCtx(ctx);
        if (!session) {
          throw new APIError("UNAUTHORIZED", {
            message: "Authentication required",
          });
        }

        const requestedEmail = typeof ctx.body?.email === "string" ? normalizeEmail(ctx.body.email) : "";
        if (!requestedEmail || requestedEmail !== normalizeEmail(session.user.email)) {
          throw new APIError("FORBIDDEN", {
            message: "Email verification request not allowed",
          });
        }
      }),
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
        update: {
          after: async (user, context) => {
            await persistEmailVerifiedAt({
              database,
              user: {
                id: user.id,
                emailVerified: user.emailVerified,
              },
              contextPath: context?.path,
            });
          },
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
