import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LoginPageContent } from "@/components/auth/login-page-content";
import { isSafeInternalCallback, normalizeEmail } from "@/lib/auth/utils";

const { signInEmail, signOutMock, replaceMock, fetchMock } = vi.hoisted(() => ({
  signInEmail: vi.fn(),
  signOutMock: vi.fn(),
  replaceMock: vi.fn(),
  fetchMock: vi.fn(),
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
    signOut: signOutMock,
  },
}));

describe("authentication foundation", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    signInEmail.mockReset();
    signOutMock.mockReset();
    replaceMock.mockReset();
    fetchMock.mockReset();
    signInEmail.mockResolvedValue({ error: null });
    signOutMock.mockResolvedValue(undefined);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ destination: "/admin" }),
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  it("normalizes email addresses before sign in", () => {
    expect(normalizeEmail("  Demo@Clinica.com.br  ")).toBe("demo@clinica.com.br");
  });

  it("rejects external callback URLs", () => {
    expect(isSafeInternalCallback("https://evil.example/")).toBe(false);
    expect(isSafeInternalCallback("/dashboard")).toBe(true);
  });

  it("submits credentials and resolves the destination after fresh login", async () => {
    render(<LoginPageContent />);

    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "  Demo@Clinica.com.br  " } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: /Entrar/i }));

    await waitFor(() => expect(signInEmail).toHaveBeenCalled());
    expect(signOutMock).toHaveBeenCalled();
    expect(signInEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "demo@clinica.com.br",
        password: "secret123",
        rememberMe: false,
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/post-login-destination",
      expect.objectContaining({ cache: "no-store" }),
    );
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/admin"));
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
