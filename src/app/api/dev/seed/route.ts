import bcrypt from "bcryptjs";
import { jsonError, jsonOk } from "@/lib/api";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import Ticket, { nextTicketNumber } from "@/lib/models/Ticket";

export const dynamic = "force-dynamic";

const SEED_PASSWORD = "SupportFlow@123";

const SEED_CREDENTIALS = [
  { email: "admin@supportflow.app", name: "SupportFlow Admin", username: "sflowadmin", role: "admin" },
  { email: "agent@supportflow.app", name: "Amelia Agent", username: "sflowagent", role: "agent" },
  { email: "demo@supportflow.app", name: "Dennis Customer", username: "sflowdemo", role: "customer" },
];

/**
 * Dev/demo helper: creates a customer, an agent and an admin that can be used
 * to demonstrate the whole role workflow. Only enabled during development or
 * when ALLOW_SEED=true (admin role must never be self-assignable by users).
 */
export async function POST() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_SEED !== "true") {
    return jsonError("Seeding is disabled in production.", 403);
  }

  try {
    await connectDB();

    const created: { email: string; role: string }[] = [];
    let passwordHash: string | null = null;

    for (const cred of SEED_CREDENTIALS) {
      passwordHash = passwordHash ?? (await bcrypt.hash(SEED_PASSWORD, 12));
      const existing = await User.findOne({ email: cred.email });
      if (existing) {
        // Reset the demo account so seeded credentials always work,
        // even if a user was previously registered manually with the same email.
        let changed = false;
        if (existing.passwordHash !== passwordHash) {
          existing.passwordHash = passwordHash;
          changed = true;
        }
        if (existing.role !== cred.role) {
          existing.role = cred.role;
          changed = true;
        }
        if (!existing.verified) {
          existing.verified = true;
          changed = true;
        }
        if (changed) await existing.save();
      } else {
        await User.create({
          name: cred.name,
          username: cred.username,
          email: cred.email,
          passwordHash,
          provider: "credentials",
          role: cred.role,
          verified: true,
        });
        created.push({ email: cred.email, role: cred.role });
      }
    }

    const customer = await User.findOne({ email: "demo@supportflow.app" });
    const agent = await User.findOne({ email: "agent@supportflow.app" });

    if (customer && agent && (await Ticket.countDocuments()) < 3) {
      const samples: {
        subject: string;
        description: string;
        category: string;
        priority: string;
        status: string;
        assignedAgent: string | null;
        aiReviewed: boolean;
        resolutionNote?: string;
        aiCategory?: string;
        aiPriority?: string;
        aiSummary?: string;
        messages?: { sender: string; senderName: string; message: string }[];
      }[] = [
        {
          subject: "Charged twice for my subscription",
          description:
            "I was charged twice for the same order and need one payment refunded. My invoice shows two identical charges on the same day.",
          category: "Billing",
          priority: "High",
          status: "In Progress",
          assignedAgent: agent._id.toString(),
          aiReviewed: true,
          aiCategory: "Billing",
          aiPriority: "High",
          aiSummary: "Possible duplicate payment reported by customer.",
          messages: [
            { sender: "customer", senderName: customer.name, message: "Please check my latest invoice, I see two charges." },
            { sender: "agent", senderName: agent.name, message: "Thanks for flagging it. I see both transactions and have opened a refund request for the duplicate. You'll get an email within 3-5 business days." },
          ],
        },
        {
          subject: "Cannot log in to my account",
          description:
            "I keep getting 'incorrect password' even though I am sure the password is right. Maybe my account was locked after too many attempts.",
          category: "Account Access",
          priority: "High",
          status: "New",
          assignedAgent: null,
          aiReviewed: false,
          aiCategory: "Account Access",
          aiPriority: "High",
          aiSummary: "Customer reporting an account access or login problem.",
        },
        {
          subject: "Question about product warranty",
          description:
            "How long is the standard warranty on the Pro plan and does it cover accidental damage?",
          category: "Product Info",
          priority: "Low",
          status: "Resolved",
          assignedAgent: agent._id.toString(),
          aiReviewed: true,
          aiCategory: "Product Info",
          aiPriority: "Low",
          aiSummary: "Customer asking for product information or guidance.",
          resolutionNote:
            "Shared the warranty policy: 12 months, accidental damage covered under the Plus add-on.",
          messages: [
            { sender: "customer", senderName: customer.name, message: "How long is the standard warranty?" },
            { sender: "agent", senderName: agent.name, message: "The Pro plan includes a 12-month warranty. Accidental damage requires the Plus add-on. I've attached the policy." },
          ],
        },
      ];

      for (const sample of samples) {
        const ticketNumber = await nextTicketNumber();
        await Ticket.create({
          ticketNumber,
          customer: customer._id,
          assignedAgent: sample.assignedAgent,
          subject: sample.subject,
          description: sample.description,
          category: sample.category as never,
          priority: sample.priority as never,
          aiCategory: sample.aiCategory as never,
          aiPriority: sample.aiPriority as never,
          aiSummary: sample.aiSummary ?? "",
          aiReviewed: sample.aiReviewed,
          status: sample.status as never,
          resolutionNote: sample.resolutionNote ?? "",
          messages: sample.messages ?? [],
        });
      }
    }

    return jsonOk({
      message: "Demo data ready.",
      users: SEED_CREDENTIALS.map((c) => ({ email: c.email, role: c.role })),
      created,
      password: SEED_PASSWORD,
    });
  } catch (err) {
    console.error("Seed error:", err);
    return jsonError("Seeding failed.", 500);
  }
}