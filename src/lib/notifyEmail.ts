import { connectDB } from "@/lib/db";
import { emailServiceConfigured, sendEmail } from "@/lib/email";
import User from "@/lib/models/User";

const APP_NAME = process.env.APP_NAME || "SupportFlow";

function notificationsEnabled(): boolean {
  if (process.env.EMAIL_NOTIFY === "false") return false;
  return emailServiceConfigured();
}

/**
 * Fire-and-forget email notifications. Any failure is logged and swallowed so
 * the ticket request itself is never blocked by email delivery. Reuses the
 * same Gmail SMTP as OTP/reset emails (GMAIL_USER / GMAIL_APP_PASSWORD).
 */
export async function emailStaffNewTicket(info: {
  id: string;
  ticketNumber: string;
  subject: string;
}): Promise<void> {
  if (!notificationsEnabled()) return;
  try {
    await connectDB();
    const staff = await User.find({ role: { $in: ["agent", "admin"] } })
      .select("name email")
      .lean();
    const emails = staff
      .map((u) => u.email)
      .filter((e): e is string => Boolean(e && e.includes("@")))
      .slice(0, 10);
    if (!emails.length) return;

    const subject = `New complaint ${info.ticketNumber}`;
    const text =
      `${APP_NAME} — a new complaint has been submitted.\n\n` +
      `Ticket: ${info.ticketNumber}\nSubject: ${info.subject}\n` +
      `Open your dashboard to triage and assign it.\n\n` +
      `Reply inside the ticket to reach the customer in real time.`;

    for (const to of emails) {
      try {
        await sendEmail({ to, subject, text });
      } catch (err) {
        console.error(`[notifyEmail] failed to email ${to}:`, err);
      }
    }
  } catch (err) {
    console.error("[notifyEmail] staff lookup failed:", err);
  }
}

export async function emailCustomerStatusChange(info: {
  customerEmail?: string | null;
  ticketNumber: string;
  statusLabel: string;
  note?: string | null;
}): Promise<void> {
  const to = info.customerEmail;
  if (!notificationsEnabled() || !to || !to.includes("@")) return;
  try {
    const subject = `Your complaint ${info.ticketNumber} is now ${info.statusLabel}`;
    const text =
      `${APP_NAME} — update on your complaint ${info.ticketNumber}.\n\n` +
      `Status: ${info.statusLabel}\n` +
      (info.note ? `Resolution note: ${info.note}\n\n` : "\n") +
      `You can continue the conversation from your customer dashboard in real time.`;
    await sendEmail({ to, subject, text });
  } catch (err) {
    console.error(`[notifyEmail] failed to email ${to}:`, err);
  }
}