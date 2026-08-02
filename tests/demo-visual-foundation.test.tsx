import { readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DemoAppShell } from "@/components/app-shell/demo-app-shell";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { demoNavigation } from "@/lib/demo/navigation";

const navigationState = vi.hoisted(() => ({ pathname: "/demo/dashboard" }));
vi.mock("next/navigation", () => ({ usePathname: () => navigationState.pathname }));
afterEach(cleanup);

describe("demo visual foundation", () => {
  it("renders the shared shell, every module and the demo indicator", () => {
    render(<DemoAppShell><h1>Dashboard</h1></DemoAppShell>);
    expect(screen.getByRole("main")).toHaveTextContent("Dashboard");
    const navigation = screen.getByRole("navigation", { name: "Principal" });
    for (const item of demoNavigation) expect(navigation).toHaveTextContent(item.label);
    expect(screen.getAllByText("Modo demonstração").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
  });

  it("opens and closes accessible mobile navigation", async () => {
    const user = userEvent.setup();
    render(<DemoAppShell><h1>Dashboard</h1></DemoAppShell>);
    await user.click(screen.getByRole("button", { name: "Abrir menu principal" }));
    expect(screen.getByRole("dialog", { name: "Menu principal" })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Menu principal" })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Abrir menu principal" })).toHaveFocus());
  });

  it("renders loading and error states", () => {
    const { rerender } = render(<LoadingState />);
    expect(screen.getByRole("status")).toHaveTextContent("Carregando");
    rerender(<ErrorState onRetry={() => undefined} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar");
  });

  it("keeps demo files independent from auth, Prisma and database configuration", () => {
    const root = path.resolve(__dirname, "..");
    const files = ["app/(demo)/demo/layout.tsx", "components/app-shell/demo-app-shell.tsx", "lib/demo/navigation.ts", ...demoNavigation.map((item) => `app/(demo)${item.href}/page.tsx`)];
    const source = files.map((file) => readFileSync(path.join(root, file), "utf8")).join("\n");
    expect(source).not.toMatch(/better-auth|lib\/auth|@prisma|lib\/db|DATABASE_URL/);
  });

  it("keeps authenticated routes guarded server-side", () => {
    const source = readFileSync(path.resolve(__dirname, "../app/(platform)/[tenantSlug]/layout.tsx"), "utf8");
    expect(source).toContain("requireAuthenticatedTenantContext");
  });
});
