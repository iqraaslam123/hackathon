import { connectDB } from "@/lib/db";
import Ticket from "@/lib/models/Ticket";
import type { AuthUser } from "@/lib/authz";
import type { PopulatedTicket } from "@/lib/ticketSerializer";

/**
 * Loads a ticket with Customer/Agent references populated (lean).
 * Throws/catches invalid ObjectIds so routes can return 404/400 cleanly.
 */
export async function fetchTicket(ticketId: string): Promise<PopulatedTicket | null> {
  if (!/^[a-fA-F0-9]{24}$/.test(ticketId)) return null;
  await connectDB();
  return Ticket.findById(ticketId)
    .populate("customer", "name email")
    .populate("assignedAgent", "name email")
    .lean() as unknown as PopulatedTicket | null;
}

export function canViewTicket(user: AuthUser, ticket: PopulatedTicket): boolean {
  if (user.role === "admin") return true;
  if (user.role === "agent") {
    if (!ticket.assignedAgent) return true;
    return ticket.assignedAgent._id.toString() === user.id;
  }
  return (
    !!ticket.customer && ticket.customer._id.toString() === user.id
  );
}

/** Whether the user is allowed to modify this ticket (agent work + admin). */
export function canEditTicket(user: AuthUser, ticket: PopulatedTicket): boolean {
  if (user.role === "admin") return true;
  if (user.role === "agent") {
    if (!ticket.assignedAgent) return true;
    return ticket.assignedAgent._id.toString() === user.id;
  }
  return false;
}