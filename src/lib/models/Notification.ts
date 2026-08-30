import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export const notificationSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["new_ticket", "ticket_update", "message"],
      required: true,
    },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    ticketId: {
      type: Schema.Types.ObjectId,
      ref: "Ticket",
      default: null,
      index: true,
    },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export type NotificationType = InferSchemaType<typeof notificationSchema>;

const NotificationModel: Model<NotificationType> =
  (mongoose.models.Notification as Model<NotificationType>) ||
  mongoose.model<NotificationType>("Notification", notificationSchema);

export default NotificationModel;