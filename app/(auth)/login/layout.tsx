import { redirect } from "next/navigation";

import { AuthConfigurationError } from "@/lib/auth/errors";
import { getAuth } from "@/lib/auth/server";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function LoginLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  try {
    const requestHeaders = await headers();
    const session = await getAuth().api.getSession({ headers: requestHeaders });
    if (session?.user) {
      redirect("/dashboard");
    }
  } catch (error) {
    if (error instanceof AuthConfigurationError) {
      return <p role="alert">Serviço de autenticação indisponível.</p>;
    }

    throw error;
  }
  return <>{children}</>;
}
