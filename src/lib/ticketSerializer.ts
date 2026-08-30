import type { Category, Priority, TicketStatus, MessageSender } from "@/lib/ticketConstants";

export type TicketPayload = {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  category: Category;
  priority: Priority;
  aiCategory: Category | "";
  aiPriority: Priority | "";
  aiSummary: string;
  aiReviewed: boolean;
  status: TicketStatus;
  resolutionNote: string;
  customer: { id: string; name: string; email?: string } | null;
  assignedAgent: { id: string; name: string } | null;
  messages: {
    id?: string;
    sender: MessageSender;
    senderName: string;
    message: string;
    createdAt?: Date | string;
  }[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

type PopulatedUserRef = {
  _id: { toString(): string };
  name: string;
  email?: string;
} | null;

export type PopulatedTicket = {
  _id: { toString(): string };
  ticketNumber: string;
  subject: string;
  description: string;
  category: Category;
  priority: Priority;
  aiCategory: Category | "";
  aiPriority: Priority | "";
  aiSummary: string;
  aiReviewed: boolean;
  status: TicketStatus;
  resolutionNote: string;
  customer: PopulatedUserRef;
  assignedAgent: PopulatedUserRef;
  messages: {
    _id?: { toString(): string };
    sender: MessageSender;
    senderName?: string;
    message: string;
    createdAt?: Date;
  }[];
  createdAt?: Date;
  updatedAt?: Date;
};

export function serializeTicket(ticket: PopulatedTicket): TicketPayload {
  return {
    id: ticket._id.toString(),
    ticketNumber: ticket.ticketNumber,
    subject: ticket.subject,
    description: ticket.description,
    category: ticket.category,
    priority: ticket.priority,
    aiCategory: ticket.aiCategory,
    aiPriority: ticket.aiPriority,
    aiSummary: ticket.aiSummary,
    aiReviewed: ticket.aiReviewed,
    status: ticket.status,
    resolutionNote: ticket.resolutionNote,
    customer: ticket.customer
      ? {
          id: ticket.customer._id.toString(),
          name: ticket.customer.name,
          email: ticket.customer.email,
        }
      : null,
    assignedAgent: ticket.assignedAgent
      ? {
          id: ticket.assignedAgent._id.toString(),
          name: ticket.assignedAgent.name,
        }
      : null,
    messages: (ticket.messages ?? []).map((m) => ({
      id: m._id?.toString(),
      sender: m.sender,
      senderName: m.senderName ?? "",
      message: m.message,
      createdAt: m.createdAt,
    })),
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  };
}