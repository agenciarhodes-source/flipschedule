import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LoginPageContent } from "@/components/auth/login-page-content";
import { isSafeInternalCallback, normalizeEmail } from "@/lib/auth/utils";

const { signInEmail, replaceMock } = vi.hoisted(() => ({
  signInEmail: vi.fn(),
  replaceMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/auth/client", () => ({
  authClient: {
    signIn: {
      email: signInEmail,
    },
  },
}));

describe("authentication foundation", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    signInEmail.mockReset();
    replaceMock.mockReset();
    signInEmail.mockResolvedValue({ error: null });
  });

  it("normalizes email addresses before sign in", () => {
    expect(normalizeEmail("  Demo@Clinica.com.br  ")).toBe("demo@clinica.com.br");
  });

  it("rejects external callback URLs", () => {
    expect(isSafeInternalCallback("https://evil.example/")).toBe(false);
    expect(isSafeInternalCallback("/dashboard")).toBe(true);
  });

  it("submits the real login form and keeps the button actionable", async () => {
    render(<LoginPageContent />);

    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "  Demo@Clinica.com.br  " } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: /Entrar/i }));

    await waitFor(() => expect(signInEmail).toHaveBeenCalled());
    expect(signInEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "demo@clinica.com.br",
        password: "secret123",
      }),
    );
    expect(replaceMock).toHaveBeenCalledWith("/dashboard");
  });

  it("shows a generic message when credentials are invalid", async () => {
    signInEmail.mockResolvedValue({ error: { message: "Invalid credentials" } });
    render(<LoginPageContent />);

    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "demo@clinica.com.br" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "wrong-password" } });
    fireEvent.click(screen.getByRole("button", { name: /Entrar/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/Credenciais inválidas/i);
  });
});
