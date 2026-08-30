import { jsonError, jsonOk } from "@/lib/api";
import { getAuthUser } from "@/lib/authz";
import { connectDB } from "@/lib/db";
import Notification from "@/lib/models/Notification";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return jsonError("Not authenticated.", 401);
  try {
    await connectDB();
    const [items, unreadCount] = await Promise.all([
      Notification.find({ user: user.id }).sort({ createdAt: -1 }).limit(50).lean(),
      Notification.countDocuments({ user: user.id, read: false }),
    ]);
    const notifications = items.map((n) => ({
      id: n._id.toString(),
      type: n.type,
      message: n.message,
      ticketId: n.ticketId ? n.ticketId.toString() : null,
      read: n.read ?? false,
      createdAt: n.createdAt,
    }));
    return jsonOk({ notifications, unreadCount });
  } catch (err) {
    console.error("Notifications list error:", err);
    return jsonError("Something went wrong.", 500);
  }
}

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return jsonError("Not authenticated.", 401);
  let body: { id?: string; all?: boolean };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body.");
  }
  try {
    await connectDB();
    if (body.all === true) {
      await Notification.updateMany(
        { user: user.id, read: false },
        { $set: { read: true } }
      );
    } else if (body.id) {
      await Notification.updateOne(
        { _id: body.id, user: user.id },
        { $set: { read: true } }
      );
    } else {
      return jsonError("Nothing to mark as read.");
    }
    const unreadCount = await Notification.countDocuments({
      user: user.id,
      read: false,
    });
    return jsonOk({ message: "Notifications updated.", unreadCount });
  } catch (err) {
    console.error("Notifications update error:", err);
    return jsonError("Something went wrong.", 500);
  }
}