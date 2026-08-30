import { jsonError, jsonOk } from "@/lib/api";
import { getAuthUser } from "@/lib/authz";
import Ticket from "@/lib/models/Ticket";
import { fetchTicket, canViewTicket, canEditTicket } from "@/lib/ticketAccess";
import { serializeTicket } from "@/lib/ticketSerializer";
import { isCategory, isPriority, isStatus } from "@/lib/ticketConstants";
import { notifyUsers } from "@/lib/notifications";
import { emailCustomerStatusChange } from "@/lib/notifyEmail";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const user = await getAuthUser();
  if (!user) return jsonError("Not authenticated.", 401);

  const ticket = await fetchTicket(id);
  if (!ticket) return jsonError("Ticket not found.", 404);
  if (!canViewTicket(user, ticket)) return jsonError("Forbidden.", 403);

  return jsonOk({ ticket: serializeTicket(ticket) });
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const user = await getAuthUser();
  if (!user) return jsonError("Not authenticated.", 401);

  const ticket = await fetchTicket(id);
  if (!ticket) return jsonError("Ticket not found.", 404);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body.");
  }

  if (user.role === "customer") {
    const isOwner = !!ticket.customer && ticket.customer._id.toString() === user.id;
    if (!isOwner) return jsonError("Forbidden.", 403);
    const allowed = ["subject", "description", "category"];
    const forbidden = Object.keys(body).filter((k) => !allowed.includes(k));
    if (forbidden.length > 0) {
      return jsonError("Customers may only edit the subject, description and category.");
    }
    if (ticket.status !== "New") {
      return jsonError(
        "This ticket is already being handled by an agent. Please continue in the conversation instead."
      );
    }
  } else if (!canEditTicket(user, ticket)) {
    return jsonError("Forbidden.", 403);
  }

  const update: Record<string, unknown> = {};
  const errors: string[] = [];

  const aiCategory = body.aiCategory;
  if (aiCategory !== undefined) {
    if (aiCategory !== "" && !isCategory(aiCategory)) {
      return jsonError("Invalid AI category.");
    }
    update.aiCategory = aiCategory;
  }

  const aiPriority = body.aiPriority;
  if (aiPriority !== undefined) {
    if (aiPriority !== "" && !isPriority(aiPriority)) {
      return jsonError("Invalid AI priority.");
    }
    update.aiPriority = aiPriority;
  }

  const aiSummary = body.aiSummary;
  if (aiSummary !== undefined) {
    if (typeof aiSummary !== "string" || aiSummary.length > 500) {
      return jsonError("AI summary must be at most 500 characters.");
    }
    update.aiSummary = aiSummary.trim();
  }

  const aiReviewed = body.aiReviewed;
  if (aiReviewed !== undefined) {
    update.aiReviewed = Boolean(aiReviewed);
    if (aiReviewed === true) {
      const approvedCategory =
        aiCategory !== undefined
          ? (aiCategory as string)
          : ticket.aiCategory;
      const approvedPriority =
        aiPriority !== undefined
          ? (aiPriority as string)
          : ticket.aiPriority;
      if (
        approvedCategory &&
        isCategory(approvedCategory) &&
        approvedPriority &&
        isPriority(approvedPriority)
      ) {
        update.category = approvedCategory;
        update.priority = approvedPriority;
      }
    }
  }

  const subject = body.subject;
  if (subject !== undefined) {
    if (typeof subject !== "string" || !subject.trim() || subject.trim().length > 200) {
      return jsonError("Subject must be 1-200 characters.");
    }
    update.subject = subject.trim();
  }

  const description = body.description;
  if (description !== undefined) {
    if (
      typeof description !== "string" ||
      !description.trim() ||
      description.trim().length > 5000
    ) {
      return jsonError("Description must be 1-5000 characters.");
    }
    update.description = description.trim();
  }

  const category = body.category;
  if (category !== undefined) {
    if (!isCategory(category)) return jsonError("Invalid category.");
    update.category = category;
  }

  const priority = body.priority;
  if (priority !== undefined) {
    if (!isPriority(priority)) return jsonError("Invalid priority.");
    update.priority = priority;
  }

  const resolutionNote = body.resolutionNote;
  if (resolutionNote !== undefined) {
    if (typeof resolutionNote !== "string" || resolutionNote.length > 2000) {
      return jsonError("Resolution note must be at most 2000 characters.");
    }
    update.resolutionNote = resolutionNote.trim();
  }

  const assignedAgent = body.assignedAgent;
  if (assignedAgent !== undefined && assignedAgent !== null) {
    if (typeof assignedAgent !== "string") {
      return jsonError("Invalid agent id.");
    }
    update.assignedAgent = assignedAgent;
  }

  const newStatus = body.status;
  if (newStatus !== undefined) {
    if (!isStatus(newStatus)) return jsonError("Invalid status.");
    const current = ticket.status;

    if (newStatus === current) {
      // no-op status update
    } else if (current === "Resolved" && newStatus === "Resolved") {
      return jsonError("This ticket is already resolved.");
    } else if (current === "Resolved") {
      // Reopening a resolved ticket is allowed.
      update.status = newStatus;
    } else if (newStatus === "Resolved") {
      const note =
        typeof resolutionNote === "string" ? resolutionNote.trim() : ticket.resolutionNote?.trim();
      if (!note) {
        errors.push("A resolution note is required before resolving a ticket.");
      } else {
        update.status = "Resolved";
      }
    } else {
      update.status = newStatus;
    }
  }

  if (errors.length) {
    return jsonError(errors[0], 400);
  }

  const isAgentClaim = user.role === "agent";
  const wantsAssign =
    newStatus !== undefined && newStatus !== "New" &&
    !update.assignedAgent &&
    ticket.assignedAgent === null;
  if (isAgentClaim && wantsAssign) {
    update.assignedAgent = user.id;
  }

  if (update.assignedAgent && !update.status && ticket.status === "New") {
    update.status = "Assigned";
  }

  try {
    await Ticket.updateOne({ _id: ticket._id }, { $set: update });
    const updated = await fetchTicket(id);

    if (update.status && user.role !== "customer" && ticket.customer) {
      const statusLabel = String(update.status);
      const ticketNumber = ticket.ticketNumber;
      let note: string | null = null;
      let message = `Your complaint ${ticketNumber} is now ${statusLabel}.`;
      if (statusLabel === "Resolved") {
        note =
          (typeof update.resolutionNote === "string"
            ? update.resolutionNote
            : ticket.resolutionNote) ?? "";
        message = `Your complaint ${ticketNumber} has been resolved.${
          note ? ` Resolution note: ${note}` : ""
        }`;
      }
      await notifyUsers([ticket.customer._id.toString()], {
        type: "ticket_update",
        ticketId: ticket._id.toString(),
        message,
      });
      await emailCustomerStatusChange({
        customerEmail: ticket.customer.email,
        ticketNumber,
        statusLabel,
        note,
      });
    }

    if (
      update.assignedAgent &&
      String(update.assignedAgent) !== user.id &&
      update.assignedAgent !== null
    ) {
      await notifyUsers([String(update.assignedAgent)], {
        type: "ticket_update",
        ticketId: ticket._id.toString(),
        message: `You have been assigned complaint ${ticket.ticketNumber}.`,
      });
    }

    return jsonOk({ ticket: serializeTicket(updated!) });
  } catch (err) {
    console.error("Ticket update error:", err);
    return jsonError("Something went wrong.", 500);
  }
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const user = await getAuthUser();
  if (!user) return jsonError("Not authenticated.", 401);

  const ticket = await fetchTicket(id);
  if (!ticket) return jsonError("Ticket not found.", 404);

  const isOwner =
    user.role === "customer" &&
    !!ticket.customer &&
    ticket.customer._id.toString() === user.id;

  if (user.role !== "admin" && !isOwner) {
    return jsonError("Forbidden.", 403);
  }

  if (user.role === "customer" && ticket.status !== "New") {
    return jsonError(
      "This ticket is already being handled by an agent. Please continue in the conversation instead."
    );
  }

  try {
    await Ticket.deleteOne({ _id: ticket._id });
    return jsonOk({ message: "Ticket deleted.", id: ticket._id.toString() }, 200);
  } catch (err) {
    console.error("Ticket delete error:", err);
    return jsonError("Something went wrong.", 500);
  }
}