import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FoundationStatus } from "@/components/foundation-status";

describe("FoundationStatus", () => {
  it("presents the active foundation and preserved prototype", () => {
    render(<FoundationStatus />);

    expect(screen.getByRole("heading", { name: "FlipSchedule" })).toBeInTheDocument();
    expect(screen.getByText(/nova fundação Next\.js está ativa/i)).toBeInTheDocument();
    expect(screen.getByText(/protótipo do Emergent permanece preservado/i)).toBeInTheDocument();
  });
});
