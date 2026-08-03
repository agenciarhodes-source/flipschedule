import { cleanup,fireEvent,render,screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach,describe,expect,it,vi } from "vitest";
import { CrmView } from "@/components/modules/crm/crm-view";
import { PatientsView } from "@/components/modules/patients/patients-view";
import { PatientProfileView } from "@/components/modules/patients/patient-profile-view";
import { calculateAge,calculateLeadConversion,calculatePipelineValue,calculateTicketAverage,demoLeads,demoPatients,emptyLeadFilters,emptyPatientFilters,filterLeads,filterPatients,groupLeadsByStage,hasPendingReturn,isLeadOverdue } from "@/domains/demo";
vi.mock("next/navigation",()=>({useRouter:()=>({push:vi.fn()})}));
afterEach(cleanup);

describe("CRM demonstrativo",()=>{
 it("renderiza KPIs, oito etapas e lista",async()=>{const u=userEvent.setup();render(<CrmView/>);expect(screen.getByRole("region",{name:"Indicadores do CRM"}).querySelectorAll("article")).toHaveLength(8);expect(screen.getByRole("region",{name:"Pipeline de leads"})).toBeInTheDocument();await u.click(screen.getByLabelText("Lista"));expect(screen.getByRole("table",{name:"Lista de leads"})).toBeInTheDocument()});
 it("busca e limpa filtros",async()=>{const u=userEvent.setup();render(<CrmView/>);const search=screen.getByPlaceholderText(/Buscar nome/);await u.type(search,"Ana Luiza");expect(screen.getByText("Ana Luiza Prado")).toBeInTheDocument();await u.clear(search);await u.click(screen.getByRole("button",{name:/Filtros/}));expect(screen.getByText("Limpar filtros")).toBeInTheDocument()});
 it("valida novo lead",async()=>{const u=userEvent.setup();render(<CrmView/>);await u.click(screen.getByRole("button",{name:/Novo lead/}));await u.click(screen.getByRole("button",{name:"Criar lead"}));expect(screen.getByText("Informe o nome completo.")).toBeInTheDocument()});
});

describe("Pacientes demonstrativos",()=>{
 it("renderiza, busca, ordena e alterna cards",async()=>{const u=userEvent.setup();render(<PatientsView/>);expect(screen.getByRole("table",{name:"Lista de pacientes"})).toBeInTheDocument();fireEvent.change(screen.getByPlaceholderText("Buscar por nome ou telefone"),{target:{value:"Marina"}});expect(screen.getByRole("link",{name:"Marina Alves"})).toBeInTheDocument();await u.selectOptions(screen.getByLabelText("Ordenar pacientes"),"lifetimeValueCents");await u.click(screen.getByLabelText("Visualização em cards"));expect(screen.getByRole("region",{name:"Cards de pacientes"})).toBeInTheDocument()});
 it("valida criação em etapas",async()=>{const u=userEvent.setup();render(<PatientsView/>);await u.click(screen.getByRole("button",{name:"Novo paciente"}));await u.click(screen.getByRole("button",{name:"Avançar"}));expect(screen.getByText("Informe o nome completo.")).toBeInTheDocument()});
 it("registra nota e navega para agenda",async()=>{const u=userEvent.setup();render(<PatientProfileView patientId="patient-1"/>);await u.click(screen.getByRole("tab",{name:"Observações"}));await u.type(screen.getByLabelText("Nova nota"),"Nota administrativa fictícia");await u.click(screen.getByRole("button",{name:"Adicionar nota"}));expect(screen.getByText("Nota administrativa fictícia")).toBeInTheDocument();expect(screen.getByRole("link",{name:"Novo agendamento"})).toHaveAttribute("href","/demo/agenda")});
});

describe("funções puras",()=>{
 it("agrupa, soma, converte e identifica atraso",()=>{expect(Object.values(groupLeadsByStage(demoLeads)).flat()).toHaveLength(demoLeads.length);expect(calculatePipelineValue(demoLeads)).toBeGreaterThan(0);expect(calculateLeadConversion(demoLeads)).toBe(13);expect(isLeadOverdue(demoLeads[1]!)).toBe(true)});
 it("combina filtros e calcula indicadores",()=>{expect(filterLeads(demoLeads,{...emptyLeadFilters,unit:"Centro",temperature:"warm"}).every(l=>l.unit==="Centro"&&l.temperature==="warm")).toBe(true);expect(filterPatients(demoPatients,{...emptyPatientFilters,unit:"Centro",openEstimate:true}).every(p=>p.unit==="Centro"&&p.hasOpenEstimate)).toBe(true);expect(calculateAge(demoPatients[0]!.birthDate)).toBeGreaterThan(0);expect(calculateTicketAverage(demoPatients[0]!)).toBeGreaterThan(0);expect(typeof hasPendingReturn(demoPatients[0]!)).toBe("boolean")});
});
