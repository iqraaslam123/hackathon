import { jsonError, jsonOk } from "@/lib/api";
import { getAuthUser } from "@/lib/authz";
import Ticket from "@/lib/models/Ticket";
import { fetchTicket, canEditTicket } from "@/lib/ticketAccess";
import { serializeTicket } from "@/lib/ticketSerializer";
import { runTriage } from "@/lib/ai";

export const dynamic = "force-dynamic";

/**
 * Re-runs AI triage for a ticket. Agent/admin only. Never exposes the AI key.
 */
export async function POST(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const user = await getAuthUser();
  if (!user) return jsonError("Not authenticated.", 401);

  const ticket = await fetchTicket(id);
  if (!ticket) return jsonError("Ticket not found.", 404);
  if (!canEditTicket(user, ticket)) return jsonError("Forbidden.", 403);

  const triage = await runTriage(ticket.subject, ticket.description);

  await Ticket.updateOne(
    { _id: ticket._id },
    {
      $set: {
        aiCategory: triage.category,
        aiPriority: triage.priority,
        aiSummary: triage.summary,
        aiReviewed: false,
      },
    }
  );

  const updated = await fetchTicket(id);

  return jsonOk({
    triage,
    ticket: serializeTicket(updated!),
    message: "AI suggestion regenerated. Review it before approving.",
  });
}