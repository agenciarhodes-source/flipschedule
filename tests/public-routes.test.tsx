import { readFileSync } from "node:fs";
import path from "node:path";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import DemoPage from "@/app/(demo)/demo/page";
import LoginPage from "@/app/(auth)/login/page";
import CheckoutSuccessPage from "@/app/(public)/checkout/success/page";
import { appUrl, marketingUrl, publicUrls, supportEmail } from "@/lib/config/public-urls";

const { redirect } = vi.hoisted(() => ({ redirect: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect,
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

afterEach(() => {
  cleanup();
  redirect.mockClear();
});

describe("public app routes", () => {
  it("redirects the root to login on the server", async () => {
    const { default: HomePage } = await import("@/app/(marketing)/page");
    HomePage();
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("renders the official login identity and public links", () => {
    render(<LoginPage />);
    expect(screen.getByRole("heading", { name: "Entrar no FlipSchedule" })).toBeInTheDocument();
    expect(screen.getByLabelText("E-mail")).toBeInTheDocument();
    expect(screen.getByLabelText("Senha")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Esqueci minha senha" })).toHaveAttribute("href", "/forgot-password");
    expect(screen.getByRole("link", { name: /Conhecer a demonstração/ })).toHaveAttribute("href", "/demo");
    expect(screen.getByRole("link", { name: "Visitar o site oficial" })).toHaveAttribute("href", "https://flipschedule.com.br");
    expect(screen.getByRole("button", { name: /Entrar/i })).toBeEnabled();
  });

  it("redirects /demo to the dashboard", () => {
    DemoPage();
    expect(redirect).toHaveBeenCalledWith("/demo/dashboard");
  });

  it("resolves the official public URLs without environment setup", () => {
    expect(publicUrls).toEqual({ marketingUrl: "https://flipschedule.com.br", appUrl: "https://app.flipschedule.com.br", supportEmail: "atendimento@flipschedule.com.br" });
    expect({ marketingUrl, appUrl, supportEmail }).toEqual(publicUrls);
  });

  it("does not claim that checkout completed a payment", () => {
    render(<CheckoutSuccessPage />);
    expect(screen.getByText(/não confirma pagamento, assinatura ou ativação/i)).toBeInTheDocument();
    expect(screen.queryByText(/pagamento (realizado|aprovado|confirmado)/i)).not.toBeInTheDocument();
  });

  it("keeps public routes independent from Prisma and DATABASE_URL", () => {
    const root = path.resolve(__dirname, "..");
    const publicFiles = [
      "app/(marketing)/page.tsx", "app/(demo)/demo/page.tsx", "app/(demo)/demo/layout.tsx", "app/(auth)/login/page.tsx",
      "app/(auth)/first-access/page.tsx", "app/(auth)/forgot-password/page.tsx", "app/(auth)/reset-password/page.tsx",
      "app/(public)/checkout/[plano]/page.tsx", "app/(public)/checkout/success/page.tsx", "app/(public)/checkout/pending/page.tsx",
      "app/(public)/checkout/cancelled/page.tsx", "app/(public)/checkout/error/page.tsx", "app/(public)/billing/blocked/page.tsx",
      "components/auth/login-page-content.tsx", "components/public-routes/preparatory-page.tsx", "lib/config/public-urls.ts",
    ];
    const source = publicFiles.map((file) => readFileSync(path.join(root, file), "utf8")).join("\n");
    expect(source).not.toMatch(/@prisma|lib\/db|DATABASE_URL/);
  });
});
