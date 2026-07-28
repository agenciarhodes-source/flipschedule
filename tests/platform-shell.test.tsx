import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { NavigationItem } from "@/components/layout/navigation-item";
import { PlatformShell } from "@/components/layout/platform-shell";
import { PlatformSidebar } from "@/components/layout/platform-sidebar";
import { createPlatformNavigation } from "@/lib/constants/platform-navigation";

let pathname = "/clinica-vitalita/dashboard";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

const tenant = { tenantName: "Clínica Vitalità", tenantSlug: "clinica-vitalita" };

describe("platform navigation", () => {
  beforeEach(() => { pathname = "/clinica-vitalita/dashboard"; });

  it("renders every navigation item and the visual logout", () => {
    render(<PlatformSidebar {...tenant} />);
    const nav = screen.getByRole("navigation", { name: "Principal" });
    for (const label of ["Dashboard", "Agenda", "Inbox", "CRM", "Orçamentos", "Pacientes", "Configurações"]) expect(within(nav).getByRole("link", { name: label })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sair" })).toBeInTheDocument();
  });

  it("marks the current item with aria-current", () => {
    pathname = "/clinica-vitalita/agenda";
    const item = createPlatformNavigation("clinica-vitalita")[1];
    expect(item).toBeDefined();
    render(<NavigationItem item={item!} />);
    expect(screen.getByRole("link", { name: "Agenda" })).toHaveAttribute("aria-current", "page");
  });

  it("displays the fictional tenant and a semantic main region", () => {
    render(<PlatformShell {...tenant}><h1>Dashboard</h1></PlatformShell>);
    expect(screen.getAllByText("Clínica Vitalità").length).toBeGreaterThan(0);
    expect(screen.getByRole("main")).toContainElement(screen.getByRole("heading", { name: "Dashboard" }));
  });
});

describe("mobile navigation", () => {
  it("opens, exposes accessible labels, and closes from its close button", async () => {
    const user = userEvent.setup();
    render(<MobileNavigation {...tenant} />);
    const openButton = screen.getByRole("button", { name: "Abrir menu principal" });
    await user.click(openButton);
    expect(screen.getByRole("dialog", { name: "Menu principal" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Fechar menu principal" }));
    expect(screen.queryByRole("dialog", { name: "Menu principal" })).not.toBeInTheDocument();
    expect(openButton).toHaveFocus();
  });

  it("closes with Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<MobileNavigation {...tenant} />);
    const trigger = screen.getByRole("button", { name: "Abrir menu principal" });
    await user.click(trigger);
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});
