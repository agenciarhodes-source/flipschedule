import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";
import type { ApplicationContext } from "@/domains/application/context";
import { actionFailure } from "@/domains/application/actions";
import { canAccessClinic } from "@/domains/application/clinic-access";
import { getPrismaClient } from "@/lib/db";
import { LeadService } from "./crm-patient-services";
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

  private inputAllowed(input: unknown) {
    if (this.context.clinicAccess.mode === "ALL") return true;
    const clinicId = stringOrNull(record(input)?.clinicId);
    return Boolean(clinicId && canAccessClinic(this.context, clinicId));
  }

  async create(input: unknown) {
    if (!this.inputAllowed(input)) return denied();
    return this.delegate.create(input);
  }

  async update(id: string, input: unknown) {
    if (!(await this.canMutate(id)) || !this.inputAllowed(input)) return denied();
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
   * therefore require a lead whose clinic is explicitly within the scope.
   * Patient-only conversations fail closed to avoid cross-unit message leakage.
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
}
