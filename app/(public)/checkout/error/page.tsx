import { CommercialOnboardingStatus } from "@/components/public-routes/commercial-onboarding-status";

export default async function CheckoutErrorPage({
  searchParams,
}: {
  searchParams?: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  return <CommercialOnboardingStatus token={typeof params?.token === "string" ? params.token : ""} eyebrow="Status do checkout" />;
}

export const metadata = { other: { referrer: "no-referrer" } };
