import { Types } from "mongoose";

export const WORKSPACE_STATUSES = ["ACTIVE", "ARCHIVED"] as const;
export type WorkspaceStatus = (typeof WORKSPACE_STATUSES)[number];

export interface IWorkspace {
  organizationId: Types.ObjectId;
  name: string;
  description: string | null;
  status: WorkspaceStatus;
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: Types.ObjectId | null;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
