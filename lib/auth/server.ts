import "server-only";

import { betterAuth } from "better-auth";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

import { getPrismaClient } from "@/lib/db/client";
import { readAuthConfig } from "./config";
import { normalizeEmail } from "./utils";

const appEnv = process.env.APP_ENV ?? process.env.NODE_ENV ?? "development";
const isProduction = appEnv === "production";
const authConfig = readAuthConfig();
const baseURL = authConfig.baseURL ?? "http://localhost:3000";
const secret = authConfig.secret ?? "dev-only-secret";

export const auth = betterAuth({
  appName: "FlipSchedule",
  baseURL,
  secret,
  trustedOrigins: authConfig.trustedOrigins,
  database: prismaAdapter(getPrismaClient(), { provider: "postgresql" }),
  plugins: [nextCookies()],
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
    fields: {
      name: "displayName",
      email: "emailNormalized",
      emailVerified: "emailVerified",
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 14,
    updateAge: 60 * 60 * 24,
    storeSessionInDatabase: true,
    cookieCache: { enabled: false },
  },
  advanced: {
    useSecureCookies: isProduction,
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

export type AuthSession = typeof auth.$Infer.Session;
export type AuthUser = typeof auth.$Infer.Session.user;
