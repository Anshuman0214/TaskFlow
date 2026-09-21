import { Schema, model, Types } from "mongoose";

export interface ILabel {
  projectId: Types.ObjectId;
  organizationId: Types.ObjectId;
  name: string;
  color: string;
  description: string | null;
  createdAt: Date;
}

const labelSchema = new Schema<ILabel>({
  projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
  name: { type: String, required: true, trim: true },
  color: { type: String, required: true },
  description: { type: String, default: null },
  createdAt: { type: Date, default: () => new Date() },
});

labelSchema.index({ projectId: 1, name: 1 }, { unique: true });

export const Label = model<ILabel>("Label", labelSchema);
