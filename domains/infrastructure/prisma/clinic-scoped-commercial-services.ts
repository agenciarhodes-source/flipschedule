import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";
import type { ApplicationContext } from "@/domains/application/context";
import { actionFailure } from "@/domains/application/actions";
import { canAccessClinic, parseClinicAccess, scopedClinicIds } from "@/domains/application/clinic-access";
import { getPrismaClient } from "@/lib/db";
import { LeadService, PatientService } from "./crm-patient-services";
import { QuickPatientService } from "./services";
import { ConversationService, TreatmentPlanService } from "./treatment-inbox-services";

const denied = () =>
  actionFailure("ACCESS_DENIED", "Esta operação não está disponível para a sua unidade.");

function record(input: unknown): Record<string, unknown> | null {
  return input && typeof input === "object" && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : null;
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

async function patientBelongsToScope(
  prisma: PrismaClient,
  context: ApplicationContext,
  patientId: string,
) {
  if (context.clinicAccess.mode === "ALL") return true;
  const ids = scopedClinicIds(context) ?? [];
  const patient = await prisma.patient.findFirst({
    where: {
      id: patientId,
      tenantId: context.tenantId,
      OR: [
        { appointments: { some: { tenantId: context.tenantId, clinicId: { in: ids } } } },
        { leads: { some: { tenantId: context.tenantId, clinicId: { in: ids } } } },
        { treatmentPlans: { some: { tenantId: context.tenantId, clinicId: { in: ids } } } },
      ],
    },
    select: { id: true },
  });
  return Boolean(patient);
}

export class ScopedPatientService {
  private readonly delegate: PatientService;

  constructor(
    private readonly context: ApplicationContext,
    private readonly prisma: PrismaClient = getPrismaClient(),
  ) {
    this.delegate = new PatientService(context, prisma);
  }

  async create(input: unknown) {
    return this.delegate.create(input);
  }

  async update(id: string, input: unknown) {
    if (!(await patientBelongsToScope(this.prisma, this.context, id))) return denied();
    return this.delegate.update(id, input);
  }
}

export class ScopedQuickPatientService {
  private readonly delegate: QuickPatientService;

  constructor(
    private readonly context: ApplicationContext,
    private readonly prisma: PrismaClient = getPrismaClient(),
  ) {
    this.delegate = new QuickPatientService(context, prisma);
  }

  async create(input: unknown) {
    if (this.context.clinicAccess.mode === "ALL") return this.delegate.create(input);

    const phone = stringOrNull(record(input)?.phoneE164);
    if (phone) {
      const existing = await this.prisma.patient.findFirst({
        where: { tenantId: this.context.tenantId, phoneE164: phone, archivedAt: null },
        select: { id: true },
      });
      if (existing && !(await patientBelongsToScope(this.prisma, this.context, existing.id))) {
        return actionFailure(
          "CONFLICT",
          "Já existe um cadastro com este contato. Solicite revisão de um gestor com acesso global.",
        );
      }
    }
    return this.delegate.create(input);
  }
}

export class ScopedLeadService {
  private readonly delegate: LeadService;

  constructor(
    private readonly context: ApplicationContext,
    private readonly prisma: PrismaClient = getPrismaClient(),
  ) {
    this.delegate = new LeadService(context, prisma);
  }

  private async canMutate(id: string) {
    if (this.context.clinicAccess.mode === "ALL") return true;
    const row = await this.prisma.lead.findFirst({
      where: { id, tenantId: this.context.tenantId },
      select: { clinicId: true },
    });
    return Boolean(row?.clinicId && canAccessClinic(this.context, row.clinicId));
  }

  private async inputAllowed(input: unknown) {
    if (this.context.clinicAccess.mode === "ALL") return true;
    const data = record(input);
    const clinicId = stringOrNull(data?.clinicId);
    if (!clinicId || !canAccessClinic(this.context, clinicId)) return false;

    const assigneeId = stringOrNull(data?.assignedMembershipId);
    if (!assigneeId) return true;
    const assignee = await this.prisma.membership.findFirst({
      where: { id: assigneeId, tenantId: this.context.tenantId, status: "ACTIVE" },
      select: { role: true, clinicAccess: true },
    });
    if (!assignee) return false;
    const access = parseClinicAccess(assignee.clinicAccess, assignee.role);
    return canAccessClinic({ clinicAccess: access }, clinicId);
  }

  async create(input: unknown) {
    if (!(await this.inputAllowed(input))) return denied();
    return this.delegate.create(input);
  }

  async update(id: string, input: unknown) {
    if (!(await this.canMutate(id)) || !(await this.inputAllowed(input))) return denied();
    return this.delegate.update(id, input);
  }

  async move(id: string, input: unknown) {
    if (!(await this.canMutate(id))) return denied();
    return this.delegate.move(id, input);
  }

  async convert(id: string) {
    if (!(await this.canMutate(id))) return denied();
    return this.delegate.convert(id);
  }
}

export class ScopedTreatmentPlanService {
  private readonly delegate: TreatmentPlanService;

  constructor(
    private readonly context: ApplicationContext,
    private readonly prisma: PrismaClient = getPrismaClient(),
  ) {
    this.delegate = new TreatmentPlanService(context, prisma);
  }

  private inputAllowed(input: unknown) {
    if (this.context.clinicAccess.mode === "ALL") return true;
    const clinicId = stringOrNull(record(input)?.clinicId);
    return Boolean(clinicId && canAccessClinic(this.context, clinicId));
  }

  private async canMutate(id: string) {
    if (this.context.clinicAccess.mode === "ALL") return true;
    const row = await this.prisma.treatmentPlan.findFirst({
      where: { id, tenantId: this.context.tenantId },
      select: { clinicId: true },
    });
    return Boolean(row?.clinicId && canAccessClinic(this.context, row.clinicId));
  }

  async create(input: unknown) {
    if (!this.inputAllowed(input)) return denied();
    return this.delegate.create(input);
  }

  async update(id: string, input: unknown) {
    if (!(await this.canMutate(id)) || !this.inputAllowed(input)) return denied();
    return this.delegate.update(id, input);
  }

  async duplicate(id: string) {
    if (!(await this.canMutate(id))) return denied();
    return this.delegate.duplicate(id);
  }

  async transition(id: string, input: unknown) {
    if (!(await this.canMutate(id))) return denied();
    return this.delegate.transition(id, input);
  }

  async createPublicLink(id: string) {
    if (!(await this.canMutate(id))) return denied();
    return this.delegate.createPublicLink(id);
  }
}

export class ScopedConversationService {
  private readonly delegate: ConversationService;

  constructor(
    private readonly context: ApplicationContext,
    private readonly prisma: PrismaClient = getPrismaClient(),
  ) {
    this.delegate = new ConversationService(context, prisma);
  }

  /**
   * Conversations do not yet carry clinicId directly. For restricted users we
   * require a lead whose clinic is explicitly within the scope. Patient-only
   * conversations fail closed to avoid cross-unit message leakage.
   */
  private async leadAllowed(leadId: string | null) {
    if (this.context.clinicAccess.mode === "ALL") return true;
    if (!leadId) return false;
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId: this.context.tenantId },
      select: { clinicId: true },
    });
    return Boolean(lead?.clinicId && canAccessClinic(this.context, lead.clinicId));
  }

  private async conversationAllowed(id: string) {
    if (this.context.clinicAccess.mode === "ALL") return true;
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, tenantId: this.context.tenantId },
      select: { leadId: true },
    });
    return this.leadAllowed(conversation?.leadId ?? null);
  }

  async create(input: unknown) {
    const leadId = stringOrNull(record(input)?.leadId);
    if (!(await this.leadAllowed(leadId))) return denied();
    return this.delegate.create(input);
  }

  async link(id: string, input: unknown) {
    if (!(await this.conversationAllowed(id))) return denied();
    const leadId = stringOrNull(record(input)?.leadId);
    if (!(await this.leadAllowed(leadId))) return denied();
    return this.delegate.link(id, input);
  }

  async transition(id: string, input: unknown) {
    if (!(await this.conversationAllowed(id))) return denied();
    return this.delegate.transition(id, input);
  }

  async addMessage(id: string, input: unknown) {
    if (!(await this.conversationAllowed(id))) return denied();
    return this.delegate.addMessage(id, input);
  }

  async markRead(id: string) {
    if (!(await this.conversationAllowed(id))) return denied();
    return this.delegate.markRead(id);
  }
}
