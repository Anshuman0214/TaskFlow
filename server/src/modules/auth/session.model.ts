import { Schema, model, Types } from "mongoose";

export interface ISession {
  userId: Types.ObjectId;
  refreshTokenHash: string;
  userAgent: string | null;
  ipAddress: string | null;
  lastActiveAt: Date;
  expiresAt: Date;
  isRevoked: boolean;
  revokedAt: Date | null;
}

const sessionSchema = new Schema<ISession>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  refreshTokenHash: { type: String, required: true },
  userAgent: { type: String, default: null },
  ipAddress: { type: String, default: null },
  lastActiveAt: { type: Date, default: () => new Date() },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  isRevoked: { type: Boolean, default: false },
  revokedAt: { type: Date, default: null },
});

export const Session = model<ISession>("Session", sessionSchema);
