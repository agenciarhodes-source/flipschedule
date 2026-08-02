import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { DashboardView } from "@/components/modules/dashboard/dashboard-view";
import { AgendaView } from "@/components/modules/agenda/agenda-view";
import { demoAppointments, scheduleBlocks } from "@/domains/demo";
import { calculateAttendance, calculateRevenue, detectConflict, emptyScheduleFilters, filterAppointments } from "@/domains/demo/schedule";

afterEach(cleanup);
describe("dashboard demonstrativo", () => {
  it("renderiza oito KPIs, agenda e altera período e unidade", async () => { const user=userEvent.setup(); render(<DashboardView/>); expect(screen.getByRole("region",{name:"Indicadores"}).querySelectorAll("article")).toHaveLength(8); expect(screen.getByText("Agenda do dia")).toBeInTheDocument(); await user.selectOptions(screen.getByLabelText("Período do dashboard"),"30d"); await user.selectOptions(screen.getByLabelText("Unidade do dashboard"),"leste"); expect(screen.getByText(/Unidade Zona Leste/)).toBeInTheDocument(); });
  it("dispensa alerta e mostra vazio", async()=>{const user=userEvent.setup();render(<DashboardView/>);await user.click(screen.getByRole("button",{name:/Dispensar alerta Horários ociosos/}));expect(screen.queryByText("Horários ociosos")).not.toBeInTheDocument();await user.click(screen.getByText("Simular vazio"));expect(screen.getByText("Sem dados neste período")).toBeInTheDocument();});
  it("calcula receita e comparecimento",()=>{expect(calculateRevenue([{...demoAppointments[0]!,status:"completed",revenueCents:12345}])).toBe(12345);expect(calculateAttendance([{...demoAppointments[0]!,status:"completed"},{...demoAppointments[1]!,status:"no_show"}])).toBe(50);});
});
describe("agenda demonstrativa",()=>{
  it("alterna dia, semana e lista e navega",async()=>{const user=userEvent.setup();render(<AgendaView/>);expect(screen.getByLabelText("Visualização diária")).toBeInTheDocument();await user.click(screen.getByText("Semana"));expect(screen.getByLabelText("Visualização semanal")).toBeInTheDocument();await user.click(screen.getByText("Lista"));expect(screen.getByLabelText("Visualização em lista")).toBeInTheDocument();await user.click(screen.getByLabelText("Próxima data"));});
  it("valida e cria agendamento local",async()=>{const user=userEvent.setup();render(<AgendaView/>);await user.click(screen.getByRole("button",{name:"Novo agendamento"}));await user.click(screen.getByRole("button",{name:"Salvar agendamento"}));expect(screen.getByText("Informe o paciente.")).toBeInTheDocument();await user.type(screen.getByLabelText(/Paciente/),"Paciente Fictício");await user.click(screen.getByRole("button",{name:"Salvar agendamento"}));expect(await screen.findByText(/criado localmente/)).toBeInTheDocument();});
  it("abre detalhes e executa duas mudanças sequenciais",async()=>{const user=userEvent.setup();render(<AgendaView/>);const cards=screen.getAllByRole("button",{name:/Marina Alves/});await user.click(cards[0]!);await user.click(screen.getByText("Confirmar"));await user.click(screen.getByText("Cancelar"));expect(screen.getByRole("status")).toHaveTextContent("Cancelado");});
  it("detecta conflito, bloqueio e filtra",()=>{const a=demoAppointments[4]!;expect(detectConflict({...a,id:"new"},demoAppointments,scheduleBlocks).conflict).toBe(true);const block={...a,id:"block-test",professionalId:"prof-ana",startsAt:"2026-09-16T12:00:00.000Z"};expect(detectConflict(block,[],scheduleBlocks).conflict).toBe(true);const result=filterAppointments(demoAppointments,{...emptyScheduleFilters,unitId:"centro",status:"completed"});expect(result.every(x=>x.unitId==="centro"&&x.status==="completed")).toBe(true);});
});
