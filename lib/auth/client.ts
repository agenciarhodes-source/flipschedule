"use client";

import { createAuthClient } from "better-auth/react";

type AuthResult = { error: unknown | null };
type AuthClient = {
  signIn: {
    email: (input: { email: string; password: string; callbackURL?: string }) => Promise<AuthResult>;
  };
  signOut: () => Promise<void>;
  sendVerificationEmail: (input: { email: string; callbackURL?: string }) => Promise<AuthResult>;
};

const baseURL = process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

export const authClient = createAuthClient({ baseURL }) as unknown as AuthClient;
