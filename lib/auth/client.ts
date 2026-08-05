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

export const authClient = createAuthClient() as unknown as AuthClient;
