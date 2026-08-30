import { jsonError, jsonOk } from "@/lib/api";
import { getAuthUser } from "@/lib/authz";
import { connectDB } from "@/lib/db";
import { runTriage } from "@/lib/ai";
import Ticket, { nextTicketNumber } from "@/lib/models/Ticket";
import { fetchTicket, canViewTicket, canEditTicket } from "@/lib/ticketAccess";
import { serializeTicket } from "@/lib/ticketSerializer";
import { isCategory, isStatus } from "@/lib/ticketConstants";
import { notifyStaffNewTicket } from "@/lib/notifications";
import { emailStaffNewTicket } from "@/lib/notifyEmail";

export const dynamic = "force-dynamic";

async function listQueryFor(user: { id: string; role: string }) {
  if (user.role === "customer") return { customer: user.id };
  if (user.role === "agent") {
    return { $or: [{ assignedAgent: user.id }, { status: "New" }] };
  }
  return {};
}

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return jsonError("Not authenticated.", 401);

  let body: { subject?: string; description?: string; category?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body.");
  }

  const subject = body.subject?.trim() ?? "";
  const description = body.description?.trim() ?? "";

  if (!subject) return jsonError("Subject is required.");
  if (subject.length > 200)
    return jsonError("Subject must be 200 characters or fewer.");
  if (!description) return jsonError("Description is required.");
  if (description.length > 5000)
    return jsonError("Description must be 5000 characters or fewer.");

  let category: string | undefined;
  if (body.category !== undefined && body.category !== "") {
    if (!isCategory(body.category)) return jsonError("Invalid category.");
    category = body.category;
  }

  await connectDB();

  try {
    const triage = await runTriage(subject, description);

    const ticketNumber = await nextTicketNumber();
    const ticket = await Ticket.create({
      ticketNumber,
      customer: user.id,
      subject,
      description,
      category: category ?? "General Inquiry",
      priority: "Medium",
      aiCategory: category ?? triage.category,
      aiPriority: triage.priority,
      aiSummary: triage.summary,
      aiReviewed: false,
      status: "New",
    });

    const full = await fetchTicket(ticket._id.toString());
    await notifyStaffNewTicket({
      id: ticket._id.toString(),
      ticketNumber,
      subject,
    });
    await emailStaffNewTicket({
      id: ticket._id.toString(),
      ticketNumber,
      subject,
    });
    return jsonOk({ ticket: serializeTicket(full!) }, 201);
  } catch (err) {
    if (err && typeof err === "object" && (err as { code?: number }).code === 11000) {
      // Retry once on a rare ticketNumber collision.
      try {
        const triage = await runTriage(subject, description);
        const ticketNumber = await nextTicketNumber();
        const ticket = await Ticket.create({
          ticketNumber,
          customer: user.id,
          subject,
          description,
          category: category ?? "General Inquiry",
          priority: "Medium",
          aiCategory: category ?? triage.category,
          aiPriority: triage.priority,
          aiSummary: triage.summary,
          aiReviewed: false,
          status: "New",
        });
        const full = await fetchTicket(ticket._id.toString());
        await notifyStaffNewTicket({
          id: ticket._id.toString(),
          ticketNumber,
          subject,
        });
        await emailStaffNewTicket({
          id: ticket._id.toString(),
          ticketNumber,
          subject,
        });
        return jsonOk({ ticket: serializeTicket(full!) }, 201);
      } catch (err2) {
        console.error("Ticket create retry error:", err2);
        return jsonError("Something went wrong. Please try again.", 500);
      }
    }
    console.error("Ticket create error:", err);
    return jsonError("Something went wrong. Please try again.", 500);
  }
}

export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user) return jsonError("Not authenticated.", 401);

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status");

  const query = (await listQueryFor(user)) as Record<string, unknown>;
  if (statusParam) {
    if (!isStatus(statusParam)) return jsonError("Invalid status filter.");
    if (user.role === "agent" && statusParam !== "New") {
      query.assignedAgent = user.id;
      query.status = statusParam;
    } else {
      query.status = statusParam;
    }
  }

  try {
    await connectDB();
    const tickets = await Ticket.find(query as never)
      .sort({ createdAt: -1 })
      .populate("customer", "name email")
      .populate("assignedAgent", "name email")
      .lean();

    return jsonOk({ tickets: tickets.map((t) => serializeTicket(t as never)) });
  } catch (err) {
    console.error("Tickets list error:", err);
    return jsonError("Something went wrong.", 500);
  }
}