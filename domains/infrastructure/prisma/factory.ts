import "server-only";
import type { ApplicationContext } from "@/domains/application/context";
import { PrismaAppointmentReader, PrismaClinicReader, PrismaProcedureReader, PrismaProfessionalReader, PrismaResourceReader, PrismaWorkingHoursReader } from "./readers";
export function createPrismaReaders(context: ApplicationContext) { return { clinics: new PrismaClinicReader(context), professionals: new PrismaProfessionalReader(context), procedures: new PrismaProcedureReader(context), resources: new PrismaResourceReader(context), workingHours: new PrismaWorkingHoursReader(context), appointments: new PrismaAppointmentReader(context) }; }

