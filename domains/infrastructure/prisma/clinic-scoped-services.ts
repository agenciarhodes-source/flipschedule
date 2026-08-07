import "server-only";

import { z } from "zod";

import type { PrismaClient } from "@/generated/prisma/client";
import type { ApplicationContext } from "@/domains/application/context";
import type { AppointmentStatus } from "@/domains/application/view-models";
import { actionFailure } from "@/domains/application/actions";
import { canAccessClinic, scopedClinicIds } from "@/domains/application/clinic-access";
import { getPrismaClient } from "@/lib/db";
import {
  AppointmentService,
  ClinicService,
  ProfessionalService,
  ResourceService,
  ScheduleBlockService,
  WorkingHoursService,
} from "./services";

const uuid = z.string().uuid();
const clinicInput = z.object({ clinicId: uuid }).passthrough();
const professionalInput = z.object({ clinicIds: z.array(uuid).min(1) }).passthrough();
const blockInput = z.object({
  clinicId: uuid.nullable().optional(),
  professionalId: uuid.nullable().optional(),
  resourceId: uuid.nullable().optional(),
}).passthrough();

const denied = () =>
  actionFailure("ACCESS_DENIED", "Esta operação não está disponível para a sua unidade.");

function asRecord(input: unknown): Record<string, unknown> | null {
  return input && typeof input === "object" && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : null;
}

export class ScopedClinicService {
  private readonly delegate: ClinicService;

  constructor(
    private readonly context: ApplicationContext,
    private readonly prisma: PrismaClient = getPrismaClient(),
  ) {
    this.delegate = new ClinicService(context, prisma);
  }

  async create(input: unknown) {
    if (this.context.clinicAccess.mode !== "ALL") return denied();
    return this.delegate.create(input);
  }

  async update(id: string, input: unknown) {
    if (!canAccessClinic(this.context, id)) return denied();
    return this.delegate.update(id, input);
  }
}

export class ScopedProfessionalService {
  private readonly delegate: ProfessionalService;

  constructor(
    private readonly context: ApplicationContext,
    private readonly prisma: PrismaClient = getPrismaClient(),
  ) {
    this.delegate = new ProfessionalService(context, prisma);
  }

  async create(input: unknown) {
    const parsed = professionalInput.safeParse(input);
    if (!parsed.success) return this.delegate.create(input);
    if (parsed.data.clinicIds.some((id) => !canAccessClinic(this.context, id))) return denied();
    return this.delegate.create(input);
  }

  async update(id: string, input: unknown) {
    const parsed = professionalInput.safeParse(input);
    const record = asRecord(input);
    if (!parsed.success || !record) return this.delegate.update(id, input);

    if (parsed.data.clinicIds.some((clinicId) => !canAccessClinic(this.context, clinicId))) {
      return denied();
    }

    if (this.context.clinicAccess.mode === "ALL") {
      return this.delegate.update(id, input);
    }

    const currentLinks = await this.prisma.professionalClinic.findMany({
      where: {
        tenantId: this.context.tenantId,
        professionalId: id,
        active: true,
      },
      select: { clinicId: true },
    });
    const accessible = new Set(this.context.clinicAccess.clinicIds);
    if (!currentLinks.some((link) => accessible.has(link.clinicId))) return denied();

    const preservedOutsideScope = currentLinks
      .map((link) => link.clinicId)
      .filter((clinicId) => !accessible.has(clinicId));
    const mergedClinicIds = [...new Set([...parsed.data.clinicIds, ...preservedOutsideScope])];

    return this.delegate.update(id, { ...record, clinicIds: mergedClinicIds });
  }
}

export class ScopedResourceService {
  private readonly delegate: ResourceService;

  constructor(
    private readonly context: ApplicationContext,
    private readonly prisma: PrismaClient = getPrismaClient(),
  ) {
    this.delegate = new ResourceService(context, prisma);
  }

  async create(input: unknown) {
    const parsed = clinicInput.safeParse(input);
    if (parsed.success && !canAccessClinic(this.context, parsed.data.clinicId)) return denied();
    return this.delegate.create(input);
  }

  async update(id: string, input: unknown) {
    const parsed = clinicInput.safeParse(input);
    if (parsed.success && !canAccessClinic(this.context, parsed.data.clinicId)) return denied();
    if (this.context.clinicAccess.mode !== "ALL") {
      const existing = await this.prisma.resource.findFirst({
        where: { id, tenantId: this.context.tenantId },
        select: { clinicId: true },
      });
      if (!existing || !canAccessClinic(this.context, existing.clinicId)) return denied();
    }
    return this.delegate.update(id, input);
  }
}

export class ScopedWorkingHoursService {
  private readonly delegate: WorkingHoursService;

  constructor(
    private readonly context: ApplicationContext,
    private readonly prisma: PrismaClient = getPrismaClient(),
  ) {
    this.delegate = new WorkingHoursService(context, prisma);
  }

  async replace(input: unknown) {
    const parsed = clinicInput.safeParse(input);
    if (parsed.success && !canAccessClinic(this.context, parsed.data.clinicId)) return denied();
    return this.delegate.replace(input);
  }
}

export class ScopedScheduleBlockService {
  private readonly delegate: ScheduleBlockService;

  constructor(
    private readonly context: ApplicationContext,
    private readonly prisma: PrismaClient = getPrismaClient(),
  ) {
    this.delegate = new ScheduleBlockService(context, prisma);
  }

  async create(input: unknown) {
    const parsed = blockInput.safeParse(input);
    if (!parsed.success || this.context.clinicAccess.mode === "ALL") {
      return this.delegate.create(input);
    }

    const { clinicId, professionalId, resourceId } = parsed.data;
    if (clinicId && !canAccessClinic(this.context, clinicId)) return denied();

    if (resourceId) {
      const resource = await this.prisma.resource.findFirst({
        where: { id: resourceId, tenantId: this.context.tenantId },
        select: { clinicId: true },
      });
      if (!resource || !canAccessClinic(this.context, resource.clinicId)) return denied();
    }

    if (professionalId) {
      // A professional-only block would affect every unit where the professional works.
      // Scoped users must anchor the block to one allowed clinic.
      if (!clinicId) return denied();
      const link = await this.prisma.professionalClinic.findFirst({
        where: {
          tenantId: this.context.tenantId,
          professionalId,
          clinicId,
          active: true,
        },
        select: { professionalId: true },
      });
      if (!link) return denied();
    }

    return this.delegate.create(input);
  }

  async remove(id: string) {
    if (this.context.clinicAccess.mode !== "ALL") {
      const row = await this.prisma.scheduleBlock.findFirst({
        where: { id, tenantId: this.context.tenantId },
        select: {
          clinicId: true,
          resource: { select: { clinicId: true } },
        },
      });
      const clinicId = row?.clinicId ?? row?.resource?.clinicId ?? null;
      if (!clinicId || !canAccessClinic(this.context, clinicId)) return denied();
    }
    return this.delegate.remove(id);
  }
}

export class ScopedAppointmentService {
  private readonly delegate: AppointmentService;

  constructor(
    private readonly context: ApplicationContext,
    private readonly prisma: PrismaClient = getPrismaClient(),
  ) {
    this.delegate = new AppointmentService(context, prisma);
  }

  async create(input: unknown) {
    const parsed = clinicInput.safeParse(input);
    if (parsed.success && !canAccessClinic(this.context, parsed.data.clinicId)) return denied();
    return this.delegate.create(input);
  }

  private async canMutate(id: string) {
    if (this.context.clinicAccess.mode === "ALL") return true;
    const ids = scopedClinicIds(this.context) ?? [];
    const row = await this.prisma.appointment.findFirst({
      where: {
        id,
        tenantId: this.context.tenantId,
        clinicId: { in: ids },
      },
      select: { id: true },
    });
    return Boolean(row);
  }

  async transition(id: string, status: AppointmentStatus, reason?: string) {
    if (!(await this.canMutate(id))) return denied();
    return this.delegate.transition(id, status, reason);
  }

  async reschedule(id: string, input: unknown) {
    if (!(await this.canMutate(id))) return denied();
    return this.delegate.reschedule(id, input);
  }
}
