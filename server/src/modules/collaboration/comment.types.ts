import { Types } from "mongoose";

export interface IComment {
  taskId: Types.ObjectId;
  organizationId: Types.ObjectId;
  content: string;
  mentionedUserIds: Types.ObjectId[];
  editedAt: Date | null;
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: Types.ObjectId | null;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAttachment {
  taskId: Types.ObjectId;
  organizationId: Types.ObjectId;
  uploadedBy: Types.ObjectId;
  fileName: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  cloudinaryPublicId: string;
  fileUrl: string;
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}
