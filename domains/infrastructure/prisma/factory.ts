import "server-only";
import type { ApplicationContext } from "@/domains/application/context";
import { PrismaProcedureReader } from "./readers";
import { ProcedureService, QuickPatientService } from "./services";
import { PrismaLeadReader, PrismaPatientReader } from "./crm-patient-readers";
import { LeadService, PatientService } from "./crm-patient-services";
import { PrismaConversationReader, PrismaTreatmentPlanReader } from "./treatment-inbox-readers";
import { ConversationService, TreatmentPlanService } from "./treatment-inbox-services";
import { OrganizationSettingsService, PrismaReportReader } from "./reports-settings";
import {
  ScopedAppointmentReader,
  ScopedClinicReader,
  ScopedProfessionalReader,
  ScopedResourceReader,
  ScopedWorkingHoursReader,
} from "./clinic-scoped-readers";
import {
  ScopedAppointmentService,
  ScopedClinicService,
  ScopedProfessionalService,
  ScopedResourceService,
  ScopedScheduleBlockService,
  ScopedWorkingHoursService,
} from "./clinic-scoped-services";

export function createPrismaReaders(context: ApplicationContext) {
  return {
    reports: new PrismaReportReader(context),
    organization: new OrganizationSettingsService(context),
    clinics: new ScopedClinicReader(context),
    professionals: new ScopedProfessionalReader(context),
    procedures: new PrismaProcedureReader(context),
    resources: new ScopedResourceReader(context),
    workingHours: new ScopedWorkingHoursReader(context),
    appointments: new ScopedAppointmentReader(context),
    leads: new PrismaLeadReader(context),
    patients: new PrismaPatientReader(context),
    treatmentPlans: new PrismaTreatmentPlanReader(context),
    conversations: new PrismaConversationReader(context),
  };
}

export function createPrismaServices(context: ApplicationContext) {
  return {
    clinics: new ScopedClinicService(context),
    professionals: new ScopedProfessionalService(context),
    procedures: new ProcedureService(context),
    resources: new ScopedResourceService(context),
    workingHours: new ScopedWorkingHoursService(context),
    scheduleBlocks: new ScopedScheduleBlockService(context),
    quickPatients: new QuickPatientService(context),
    patients: new PatientService(context),
    leads: new LeadService(context),
    appointments: new ScopedAppointmentService(context),
    treatmentPlans: new TreatmentPlanService(context),
    conversations: new ConversationService(context),
  };
}
