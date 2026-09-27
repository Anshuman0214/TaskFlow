import { Schema, model } from "mongoose";
import { INotification, NOTIFICATION_TYPES } from "./notification.types.js";

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// The list endpoint always filters on userId + isDeleted and sorts newest-first;
// isRead/type are optional narrowings on top of that.
notificationSchema.index({ userId: 1, isDeleted: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });

export const Notification = model<INotification>("Notification", notificationSchema);
