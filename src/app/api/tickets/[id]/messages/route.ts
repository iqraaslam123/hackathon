import { jsonError, jsonOk } from "@/lib/api";
import { getAuthUser } from "@/lib/authz";
import Ticket from "@/lib/models/Ticket";
import { fetchTicket, canViewTicket } from "@/lib/ticketAccess";
import { serializeTicket } from "@/lib/ticketSerializer";
import { getStaffUserIds, notifyUsers } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const user = await getAuthUser();
  if (!user) return jsonError("Not authenticated.", 401);

  const ticket = await fetchTicket(id);
  if (!ticket) return jsonError("Ticket not found.", 404);
  if (!canViewTicket(user, ticket)) return jsonError("Forbidden.", 403);

  let body: { message?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body.");
  }

  const message = body.message?.trim() ?? "";
  if (!message) return jsonError("Message cannot be empty.");
  if (message.length > 4000)
    return jsonError("Message must be 4000 characters or fewer.");

  const sender = user.role === "customer" ? "customer" : "agent";

  const update: Record<string, unknown> = {
    $push: {
      messages: {
        sender,
        senderName: user.name,
        message,
      },
    },
  };

  if (sender === "agent" && !ticket.assignedAgent) {
    update.$set = { assignedAgent: user.id };
  }
  if (sender === "agent" && ticket.status === "New") {
    update.$set = { ...(update.$set ?? {}), status: "In Progress" };
  }

  try {
    await Ticket.updateOne({ _id: ticket._id }, update);
    const updated = await fetchTicket(id);

    const ticketId = ticket._id.toString();
    if (sender === "customer") {
      const targets = ticket.assignedAgent
        ? [ticket.assignedAgent._id.toString()]
        : await getStaffUserIds();
      await notifyUsers(targets, {
        type: "message",
        ticketId,
        message: `${user.name} replied on complaint ${ticket.ticketNumber}.`,
      });
    } else if (ticket.customer) {
      await notifyUsers([ticket.customer._id.toString()], {
        type: "message",
        ticketId,
        message: `Agent ${user.name} replied on complaint ${ticket.ticketNumber}.`,
      });
    }

    return jsonOk({ ticket: serializeTicket(updated!), message: "Message sent." });
  } catch (err) {
    console.error("Message send error:", err);
    return jsonError("Something went wrong.", 500);
  }
}