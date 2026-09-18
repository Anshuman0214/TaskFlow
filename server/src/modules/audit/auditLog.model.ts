import { Schema, model, Types } from "mongoose";

export interface IAuditLog {
  organizationId: Types.ObjectId;
  actorId: Types.ObjectId;
  entityType: string;
  entityId: Types.ObjectId;
  action: string;
  previousValue?: unknown;
  newValue?: unknown;
  createdAt: Date;
}

// Audit logs are append-only: no update/delete methods are exposed anywhere
// in the codebase, per Docs/Rules.md §10 and Docs/DatabaseDesign.md.
const auditLogSchema = new Schema<IAuditLog>({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  entityType: { type: String, required: true },
  entityId: { type: Schema.Types.ObjectId, required: true },
  action: { type: String, required: true },
  previousValue: { type: Schema.Types.Mixed },
  newValue: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: () => new Date() },
});

export const AuditLog = model<IAuditLog>("AuditLog", auditLogSchema);
