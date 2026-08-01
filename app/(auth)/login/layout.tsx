import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/server";
import { headers } from "next/headers";

export default async function LoginLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (session?.user) {
    redirect("/dashboard");
  }
  return <>{children}</>;
}
