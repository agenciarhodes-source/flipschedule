import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import MarketingPage from "@/app/(marketing)/page";
import { DemoLogin } from "@/components/auth/demo-login";
import { AgendaView } from "@/components/modules/agenda/agenda-view";
import { CrmView } from "@/components/modules/crm/crm-view";
import { DashboardView } from "@/components/modules/dashboard/dashboard-view";
import { InboxView } from "@/components/modules/inbox/inbox-view";
import { PatientsView } from "@/components/modules/patients/patients-view";
import { SettingsView } from "@/components/modules/settings/settings-view";
import { PlansView } from "@/components/modules/treatment-plans/plans-view";
import { DemoPublicPlan } from "@/components/public-plan/demo-public-plan";
import { demoLeadStages, demoLeads } from "@/domains/demo";
import { formatCurrency } from "@/lib/formatting/currency";

describe("public experience",()=>{
 it("renders landing headline, metrics and login CTA",()=>{render(<MarketingPage/>);expect(screen.getByRole("heading",{level:1})).toHaveTextContent("Sua clínica");expect(screen.getByText("Receita realizada")).toBeInTheDocument();for(const link of screen.getAllByRole("link",{name:/Acessar sistema|Entrar na demonstração/}))expect(link).toHaveAttribute("href","/login")});
 it("identifies login as demo and links to the demo tenant",()=>{render(<DemoLogin/>);expect(screen.getByText(/Não há autenticação/)).toBeInTheDocument();expect(screen.getByRole("link",{name:/Entrar na demonstração/})).toHaveAttribute("href","/clinica-vitalita/dashboard")});
 it("keeps public plan acceptance entirely visual",async()=>{const user=userEvent.setup();render(<DemoPublicPlan token="demo"/>);expect(screen.getByText(/DEMONSTRAÇÃO · token demo/)).toBeInTheDocument();await user.click(screen.getByRole("button",{name:/Aceitar plano/}));expect(screen.getByRole("heading",{name:/Plano aceito visualmente/})).toBeInTheDocument();expect(screen.getByText(/Nada foi enviado, persistido ou registrado/)).toBeInTheDocument()});
});
describe("static modules",()=>{
 it("formats dashboard BRL, KPIs and alerts",()=>{render(<DashboardView/>);expect(screen.getByText(formatCurrency(18742000))).toBeInTheDocument();expect(screen.getByRole("region",{name:"Indicadores"})).toBeInTheDocument();expect(screen.getByText("3 horários vagos amanhã")).toBeInTheDocument()});
 it("renders agenda week, professionals and accessible statuses",()=>{render(<AgendaView/>);expect(screen.getByRole("region",{name:"Semana da agenda"})).toBeInTheDocument();expect(screen.getByRole("button",{name:/Dra. Ana Ribeiro/})).toBeInTheDocument();expect(screen.getByText("Confirmado")).toBeInTheDocument()});
 it("changes inbox thread and sends a local message",async()=>{const user=userEvent.setup();render(<InboxView/>);await user.click(screen.getByRole("button",{name:/João Pedro Lima/}));expect(screen.getByRole("region",{name:"Thread da conversa"})).toHaveTextContent("Vocês trabalham com implantes?");const input=screen.getByLabelText("Mensagem");await user.type(input,"Mensagem local");await user.click(screen.getByRole("button",{name:"Enviar mensagem local"}));expect(screen.getByText("Mensagem local")).toBeInTheDocument()});
 it("renders CRM columns with matching counters",()=>{render(<CrmView/>);for(const stage of demoLeadStages){const heading=screen.getByRole("heading",{name:stage.label});const column=heading.parentElement?.parentElement;expect(column).toBeTruthy();expect(within(column!).getByLabelText(`${demoLeads.filter(l=>l.stage===stage.id).length} leads`)).toBeInTheDocument()}});
 it("formats treatment plan cents and translates status",()=>{render(<PlansView/>);expect(screen.getByText(formatCurrency(460000))).toBeInTheDocument();expect(screen.getByText("Enviado")).toBeInTheDocument();expect(screen.getByText("Aceito")).toBeInTheDocument()});
 it("filters fictional patients by name and phone",()=>{render(<PatientsView/>);const search=screen.getByPlaceholderText("Buscar por nome ou telefone");fireEvent.change(search,{target:{value:"Marina"}});expect(screen.getByText("Marina Alves")).toBeInTheDocument();expect(screen.queryByText("João Pedro Lima")).not.toBeInTheDocument();fireEvent.change(search,{target:{value:"992223344"}});expect(screen.getByText("João Pedro Lima")).toBeInTheDocument()});
 it("offers accessible settings tabs and disconnected integrations",async()=>{const user=userEvent.setup();render(<SettingsView/>);expect(screen.getByRole("tablist",{name:"Seções de configurações"})).toBeInTheDocument();await user.click(screen.getByRole("tab",{name:"Integrações"}));expect(screen.getAllByText("Não conectado")).toHaveLength(3)});
});
