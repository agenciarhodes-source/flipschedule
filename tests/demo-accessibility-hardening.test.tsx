import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AccessibleDialog } from "@/components/shared/accessible-dialog";
import { DataTable } from "@/components/shared/data-table";
import { DemoNotFound } from "@/components/shared/demo-not-found";

vi.mock("next/navigation", () => ({ usePathname: () => "/demo/dashboard" }));
afterEach(cleanup);

describe("baseline técnica de acessibilidade da demonstração", () => {
  it("mantém o foco no diálogo, fecha com Escape e devolve o foco", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const trigger = createRef<HTMLButtonElement>();
    function Fixture() {
      return <><button ref={trigger}>Abrir</button><AccessibleDialog open title="Confirmar ação" description="Revise antes de continuar" onClose={onClose} returnFocusRef={trigger}><button>Cancelar</button><button>Confirmar</button></AccessibleDialog></>;
    }
    render(<Fixture />);
    expect(screen.getByRole("dialog", { name: "Confirmar ação" })).toHaveAccessibleDescription("Revise antes de continuar");
    expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Confirmar" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("expõe caption, cabeçalhos e região rolável da tabela", () => {
    render(<DataTable label="Pacientes fictícios" headings={["Nome", "Status"]}><tr><td>Ana</td><td>Ativa</td></tr></DataTable>);
    expect(screen.getByRole("table")).toHaveAccessibleName("Pacientes fictícios");
    expect(screen.getAllByRole("columnheader")).toHaveLength(2);
    expect(screen.getByRole("region")).toHaveAttribute("tabindex", "0");
  });

  it("oferece recuperação segura para conteúdo demo inexistente", () => {
    render(<DemoNotFound kind="Paciente" returnHref="/demo/pacientes" returnLabel="Voltar para pacientes" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Paciente não encontrado");
    expect(screen.getByRole("link", { name: "Voltar para pacientes" })).toHaveAttribute("href", "/demo/pacientes");
  });
});
