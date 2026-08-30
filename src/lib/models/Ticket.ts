import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { CATEGORIES, MESSAGE_SENDERS, PRIORITIES, STATUSES } from "@/lib/ticketConstants";

export const messageSchema = new Schema(
  {
    sender: {
      type: String,
      enum: MESSAGE_SENDERS,
      required: true,
    },
    senderName: { type: String, trim: true, default: "" },
    message: { type: String, required: true, trim: true, maxlength: 4000 },
  },
  { timestamps: true }
);

export const ticketSchema = new Schema(
  {
    ticketNumber: { type: String, unique: true, required: true, index: true },
    customer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    assignedAgent: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    category: {
      type: String,
      enum: CATEGORIES,
      default: "General Inquiry",
    },
    priority: {
      type: String,
      enum: PRIORITIES,
      default: "Medium",
    },
    aiCategory: {
      type: String,
      enum: ["", ...(CATEGORIES as readonly string[])],
      default: "",
    },
    aiPriority: {
      type: String,
      enum: ["", ...(PRIORITIES as readonly string[])],
      default: "",
    },
    aiSummary: { type: String, trim: true, default: "", maxlength: 500 },
    aiReviewed: { type: Boolean, default: false },
    status: {
      type: String,
      enum: STATUSES,
      default: "New",
      index: true,
    },
    resolutionNote: { type: String, trim: true, default: "", maxlength: 2000 },
    messages: { type: [messageSchema], default: [] },
  },
  { timestamps: true }
);

export type MessageType = InferSchemaType<typeof messageSchema>;
export type TicketType = InferSchemaType<typeof ticketSchema>;

const TicketModel: Model<TicketType> =
  (mongoose.models.Ticket as Model<TicketType>) ||
  mongoose.model<TicketType>("Ticket", ticketSchema);

export default TicketModel;

/** Generates the next ticket number, e.g. SF-2026-0007 */
export async function nextTicketNumber(year = new Date().getFullYear()): Promise<string> {
  const start = new Date(year, 0, 1);
  const count = await TicketModel.countDocuments({ createdAt: { $gte: start } });
  return `SF-${year}-${String(count + 1).padStart(4, "0")}`;
}