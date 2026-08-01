import { redirect } from "next/navigation";
import { NextRequest } from "next/server";

import { headers } from "next/headers";

import { auth } from "@/lib/auth/server";

export async function POST(request: NextRequest) {
  const requestHeaders = await headers();
  void request;
  await auth.api.signOut({ headers: requestHeaders });
  redirect("/login");
}
