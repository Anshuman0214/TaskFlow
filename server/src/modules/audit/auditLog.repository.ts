import { AuditLog } from "./auditLog.model.js";

interface CreateAuditLogInput {
  organizationId: string;
  actorId: string;
  entityType: string;
  entityId: string;
  action: string;
  previousValue?: unknown;
  newValue?: unknown;
}

export const createAuditLog = (input: CreateAuditLogInput) => AuditLog.create(input);
