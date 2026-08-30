import { jsonError, jsonOk } from "@/lib/api";
import { getAuthUser } from "@/lib/authz";
import { connectDB } from "@/lib/db";
import Ticket from "@/lib/models/Ticket";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return jsonError("Not authenticated.", 401);

  try {
    await connectDB();

    let filter: Record<string, unknown> = {};
    if (user.role === "customer") {
      filter = { customer: user.id };
    } else if (user.role === "agent") {
      filter = {
        $or: [{ assignedAgent: user.id }, { status: "New" }],
      };
    }

    const [total, open, inProgress, resolved, highPriority] = await Promise.all([
      Ticket.countDocuments(filter as never),
      Ticket.countDocuments({ ...filter, status: "New" } as never),
      Ticket.countDocuments({ ...filter, status: "In Progress" } as never),
      Ticket.countDocuments({ ...filter, status: "Resolved" } as never),
      Ticket.countDocuments({ ...filter, priority: "High" } as never),
    ]);

    return jsonOk({
      stats: {
        total,
        open,
        inProgress,
        resolved,
        highPriority,
      },
    });
  } catch (err) {
    console.error("Tickets stats error:", err);
    return jsonError("Something went wrong.", 500);
  }
}