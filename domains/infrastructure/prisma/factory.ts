import "server-only";
import type { ApplicationContext } from "@/domains/application/context";
import { PrismaProcedureReader } from "./readers";
import { ProcedureService } from "./services";
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
import { ScopedLeadReader, ScopedPatientReader } from "./clinic-scoped-crm-readers";
import {
  ScopedConversationReader,
  ScopedTreatmentPlanReader,
} from "./clinic-scoped-treatment-inbox-readers";
import {
  ScopedConversationService,
  ScopedLeadService,
  ScopedPatientService,
  ScopedQuickPatientService,
  ScopedTreatmentPlanService,
} from "./clinic-scoped-commercial-services";

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
    leads: new ScopedLeadReader(context),
    patients: new ScopedPatientReader(context),
    treatmentPlans: new ScopedTreatmentPlanReader(context),
    conversations: new ScopedConversationReader(context),
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
    quickPatients: new ScopedQuickPatientService(context),
    patients: new ScopedPatientService(context),
    leads: new ScopedLeadService(context),
    appointments: new ScopedAppointmentService(context),
    treatmentPlans: new ScopedTreatmentPlanService(context),
    conversations: new ScopedConversationService(context),
  };
}
