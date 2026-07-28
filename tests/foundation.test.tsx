import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FoundationPage } from "@/components/foundation/foundation-page";
import { Button } from "@/components/ui/button";
import { PRODUCT_NAME } from "@/lib/constants/product";
import { cn } from "@/lib/utils";

describe("FlipSchedule foundation", () => {
  it("uses the official product name", () => {
    expect(PRODUCT_NAME).toBe("FlipSchedule");
  });

  it("renders the basic button", () => {
    render(<Button>Continuar</Button>);
    expect(screen.getByRole("button", { name: "Continuar" })).toBeInTheDocument();
  });

  it("renders a foundation page with the product name", () => {
    render(<FoundationPage title="Agenda" />);
    expect(screen.getByRole("heading", { name: "Agenda" })).toBeInTheDocument();
    expect(screen.getByText(PRODUCT_NAME)).toBeInTheDocument();
  });

  it("combines Tailwind classes without keeping conflicts", () => {
    expect(cn("px-2 text-sm", false && "hidden", "px-4")).toBe("text-sm px-4");
  });
});
