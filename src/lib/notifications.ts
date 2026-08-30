import { connectDB } from "@/lib/db";
import Notification from "@/lib/models/Notification";
import User from "@/lib/models/User";

export type NotifyType = "new_ticket" | "ticket_update" | "message";

export async function notifyUsers(
  userIds: string[],
  payload: { type: NotifyType; ticketId: string | null; message: string }
): Promise<void> {
  const uniqueIds = [...new Set(userIds)].filter((id): id is string => Boolean(id));
  if (!uniqueIds.length) return;
  try {
    await connectDB();
    await Notification.insertMany(
      uniqueIds.map((user) => ({ user, ...payload }))
    );
  } catch (err) {
    console.error("Notification insert error:", err);
  }
}

export async function getStaffUserIds(): Promise<string[]> {
  await connectDB();
  const staff = await User.find({ role: { $in: ["agent", "admin"] } })
    .select("_id")
    .lean();
  return staff.map((u) => u._id.toString());
}

export async function notifyStaffNewTicket(info: {
  id: string;
  ticketNumber: string;
  subject: string;
}): Promise<void> {
  const userIds = await getStaffUserIds();
  await notifyUsers(userIds, {
    type: "new_ticket",
    ticketId: info.id,
    message: `New complaint ${info.ticketNumber} — ${info.subject}`,
  });
}