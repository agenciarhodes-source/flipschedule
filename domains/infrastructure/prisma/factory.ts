import "server-only";
import type { ApplicationContext } from "@/domains/application/context";
import { PrismaAppointmentReader, PrismaClinicReader, PrismaProcedureReader, PrismaProfessionalReader, PrismaResourceReader, PrismaWorkingHoursReader } from "./readers";
import { AppointmentService, ClinicService, ProfessionalService, ProcedureService, QuickPatientService, ResourceService, ScheduleBlockService, WorkingHoursService } from "./services";
import { PrismaLeadReader, PrismaPatientReader } from "./crm-patient-readers";
import { LeadService, PatientService } from "./crm-patient-services";
import { PrismaConversationReader, PrismaTreatmentPlanReader } from "./treatment-inbox-readers";
import { ConversationService, TreatmentPlanService } from "./treatment-inbox-services";
export function createPrismaReaders(context: ApplicationContext) { return { clinics: new PrismaClinicReader(context), professionals: new PrismaProfessionalReader(context), procedures: new PrismaProcedureReader(context), resources: new PrismaResourceReader(context), workingHours: new PrismaWorkingHoursReader(context), appointments: new PrismaAppointmentReader(context), leads: new PrismaLeadReader(context), patients: new PrismaPatientReader(context), treatmentPlans:new PrismaTreatmentPlanReader(context), conversations:new PrismaConversationReader(context) }; }
export function createPrismaServices(context: ApplicationContext) { return { clinics: new ClinicService(context), professionals: new ProfessionalService(context), procedures: new ProcedureService(context), resources: new ResourceService(context), workingHours: new WorkingHoursService(context), scheduleBlocks: new ScheduleBlockService(context), quickPatients: new QuickPatientService(context), patients: new PatientService(context), leads: new LeadService(context), appointments: new AppointmentService(context), treatmentPlans:new TreatmentPlanService(context), conversations:new ConversationService(context) }; }
