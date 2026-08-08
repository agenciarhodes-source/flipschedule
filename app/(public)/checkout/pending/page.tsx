import { CommercialOnboardingStatus } from "@/components/public-routes/commercial-onboarding-status";

export default async function CheckoutPendingPage({
  searchParams,
}: {
  searchParams?: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  return <CommercialOnboardingStatus token={typeof params?.token === "string" ? params.token : ""} eyebrow="Status da contratação" />;
}

export const metadata = { other: { referrer: "no-referrer" } };
