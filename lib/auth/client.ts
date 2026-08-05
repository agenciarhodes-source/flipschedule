"use client";

import { createAuthClient } from "better-auth/react";

type AuthResult = { error: unknown | null };
type SessionResult = { data: unknown | null; error: unknown | null };
type AuthClient = {
  signIn: {
    email: (input: {
      email: string;
      password: string;
      callbackURL?: string;
      rememberMe?: boolean;
    }) => Promise<AuthResult>;
  };
  signOut: () => Promise<void>;
  getSession: (input?: {
    query?: { disableCookieCache?: boolean };
  }) => Promise<SessionResult>;
  sendVerificationEmail: (input: { email: string; callbackURL?: string }) => Promise<AuthResult>;
};

export const authClient = createAuthClient() as unknown as AuthClient;
