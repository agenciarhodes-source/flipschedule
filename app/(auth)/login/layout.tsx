import { StagingBanner } from "@/components/layout/staging-banner";

export const dynamic = "force-dynamic";

export default function LoginLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <StagingBanner />
      {children}
    </>
  );
}
