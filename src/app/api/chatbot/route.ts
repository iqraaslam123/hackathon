import { jsonError, jsonOk } from "@/lib/api";
import { rateLimit } from "@/lib/rateLimit";
import { getAuthUser } from "@/lib/authz";
import { connectDB } from "@/lib/db";
import Ticket from "@/lib/models/Ticket";

export const dynamic = "force-dynamic";

export type ChatResponse = {
  reply: string;
  suggestCreate: boolean;
};

type Ctx = { userRole: string | null };

const URDU_WORDS = new Set([
  "hai", "hain", "kia", "kya", "nahi", "nhi", "chahiye", "sakta", "sakti",
  "hota", "hote", "hoti", "hoga", "hogi", "masla", "kaise", "kahan", "kab",
  "kis", "kisi", "apka", "apki", "aapka", "mera", "mujhe", "tum", "tumhara",
  "koi", "kuch", "karna", "karne", "karen", "raha", "rahi", "rahe", "thik",
  "theek", "acha", "shukriya", "kholna", "kholen", "kholi", "chahiye",
]);

function detectRomanUrdu(message: string): boolean {
  const words = message
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean);
  if (!words.length) return false;
  const hits = words.filter((w) => URDU_WORDS.has(w)).length;
  if (hits >= 2) return true;
  if (hits === 1 && words.length <= 8) return true;
  return false;
}

type Intent = {
  keywords: string[];
  reply: (ctx: Ctx) => string;
  urdu?: (ctx: Ctx) => string;
  suggestCreate: (ctx: Ctx) => boolean;
};

const INTENTS: Intent[] = [
  {
    keywords: ["hi", "hello", "hey", "namaste", "good morning", "good evening"],
    reply: () =>
      `Hello! 👋 I'm the SupportFlow assistant. I can answer questions about pricing, refunds, warranties and account access, and help you open a support ticket. What can I help you with?`,
    urdu: () =>
      `Aap ka khush amdeed! 👋 Main SupportFlow assistant hoon. Pricing, refunds, warranty, account — kisi bhi cheez ke baare mein pooch sakte hain, ya naya ticket khol sakte hain. Kya help chahiye?`,
    suggestCreate: () => false,
  },
  {
    keywords: ["price", "pricing", "cost", "plan", "subscription", "subscriptions", "how much"],
    reply: () =>
      `SupportFlow has three plans: Starter (free), Pro, and Enterprise. All plans include AI ticket triage and unlimited customer chats — higher plans add more seat and priority support. You can upgrade anytime from the admin dashboard.`,
    urdu: () =>
      `SupportFlow ke 3 plans hain: Starter (free), Pro aur Enterprise. Har plan mein AI ticket triage aur unlimited chats shamil hain — bade plans mein zyada seats aur priority support milta hai. Admin dashboard se kabhi bhi upgrade kar sakte hain.`,
    suggestCreate: () => false,
  },
  {
    keywords: ["refund", "charged twice", "double charge", "overcharge", "invoice", "billing", "bill", "payment"],
    reply: (ctx) =>
      ctx.userRole === "agent" || ctx.userRole === "admin"
        ? `For billing disputes, open the ticket in the queue, set priority to High and add a resolution note once the refund is processed. Customers see updates instantly.`
        : `Sorry to hear about a billing issue! The fastest path is to open a ticket and pick "Billing" — our agents review refunds within one business day. Can I help you submit one?`,
    urdu: (ctx) =>
      ctx.userRole === "agent" || ctx.userRole === "admin"
        ? `Billing disputes ke liye queue mein ticket kholen, priority High rakhein aur refund process hone ke baad resolution note add karein. Customer ko updates turant milein gi.`
        : `Billing masle ke liye maazrat! Sab se tez tareeqa: ticket kholen aur "Billing" category chunein — hamare agents 1 business day ke andar refund ka review karte hain. Ticket submit karane mein madad karun?`,
    suggestCreate: () => true,
  },
  {
    keywords: ["warranty", "guarantee", "return", "coverage"],
    reply: () =>
      `The standard warranty covers 12 months on all paid plans. Accidental damage is covered by the Plus add-on. Full policy docs are linked in the customer dashboard.`,
    urdu: () =>
      `Standard warranty hi 12 months ke liye hoti hai sab paid plans par. Accidental damage Plus add-on mein cover hota hai. Poori policy customer dashboard mein linked hai.`,
    suggestCreate: () => false,
  },
  {
    keywords: ["login", "log in", "sign in", "password", "locked", "otp", "reset password", "2fa"],
    reply: () =>
      `You can reset a forgotten password from the login page via "Forgot password?" — a reset link is emailed to you. If you're locked out after too many attempts, wait 10 minutes or open a ticket so an agent can unlock your account.`,
    urdu: () =>
      `Forgot password? Login page par "Forgot password?" option se reset link aapki email par aayega. Bahut attempts ke baad lock-out ho jayein to 10 minute wait karein, ya ticket kholen taake agent account unlock kare.`,
    suggestCreate: () => true,
  },
  {
    keywords: ["status", "where is my ticket", "my ticket", "ticket status", "progress"],
    reply: () =>
      `You can track any ticket from your customer dashboard — status (New → Assigned → In Progress → Resolved), the assigned agent and the conversation history are all shown live. Tickets update in real time.`,
    urdu: () =>
      `Kisi bhi ticket ka status customer dashboard mein track kar sakte hain — status (New → Assigned → In Progress → Resolved), assigned agent aur conversation — sab live dikhta hai.`,
    suggestCreate: () => false,
  },
  {
    keywords: ["open ticket", "new ticket", "create", "submit", "report issue", "problem", "bug", "issue"],
    reply: (ctx) =>
      ctx.userRole === "customer"
        ? `Sure — from your customer dashboard use "New Ticket", describe the problem, and our AI will suggest a category, priority and summary that an agent will review and confirm.`
        : `You can open a ticket right after signing in. Go to your customer dashboard → "New Ticket" and describe the problem — AI triage kicks in instantly.`,
    urdu: (ctx) =>
      ctx.userRole === "customer"
        ? `Customer dashboard mein "New Ticket" dabayen, problem likhein — AI category, priority aur summary suggest karega, aur agent isko review karke confirm karega.`
        : `Sign in ke baad customer dashboard → "New Ticket" mein jayen aur problem likhein — AI triage turant shuru ho jata hai.`,
    suggestCreate: () => true,
  },
  {
    keywords: ["agent", "human", "representative", "talk to", "real person", "escalate", "speak"],
    reply: () =>
      `I'm the first line of support, but you can talk to a real agent anytime — open a ticket, and a human agent will reply inside it. On the Pro plan, live chat with an agent is included.`,
    urdu: () =>
      `Main pehli line of support hoon, lekin aap kabhi bhi real agent se baat kar sakte hain — ticket kholen, aur ek human agent uske andar reply karega. Pro plan mein agent ke saath live chat bhi shamil hai.`,
    suggestCreate: () => true,
  },
  {
    keywords: ["thank", "thanks", "great", "awesome", "good"],
    reply: () =>
      `You're welcome! 😊 Anything else I can help with — or would you like to open a ticket?`,
    urdu: () =>
      `Meherbani! 😊 Aur kuch madad chahiye, ya naya ticket kholna chahte hain?`,
    suggestCreate: () => false,
  },
];

function matchIntent(message: string, ctx: Ctx): ChatResponse {
  const text = message.toLowerCase();
  const urdu = detectRomanUrdu(message);

  let best: Intent | null = null;
  let bestScore = 0;
  for (const intent of INTENTS) {
    const score = intent.keywords.reduce(
      (acc, w) => acc + (text.includes(w) ? 1 : 0),
      0
    );
    if (score > bestScore) {
      bestScore = score;
      best = intent;
    }
  }

  if (!best || bestScore === 0) {
    const en =
      ctx.userRole === "customer"
        ? `I couldn't find a direct answer, but our agents can. Please open a ticket with the full details and someone will help within one business day.`
        : `I couldn't find a direct answer for that. The fastest way to get help is to open a ticket — an agent will pick it up and reply inside the conversation.`;
    const ud = `Mujhe iska direct jawab nahi mila, lekin hamare agents madad kar sakte hain. Poori details ke saath ticket kholen — ek agent one business day ke andar reply karega.`;
    return { reply: urdu ? ud : en, suggestCreate: true };
  }

  return {
    reply: urdu && best.urdu ? best.urdu(ctx) : best.reply(ctx),
    suggestCreate: best.suggestCreate(ctx),
  };
}

async function buildTicketInsight(
  role: string,
  id: string,
  urdu: boolean
): Promise<ChatResponse | null> {
  if (!id) return null;
  try {
    await connectDB();
    const base =
      role === "customer"
        ? { customer: id }
        : role === "agent"
          ? { $or: [{ assignedAgent: id }, { status: "New" }] }
          : {};

    const [total, open, resolved, newest] = await Promise.all([
      Ticket.countDocuments(base as never),
      Ticket.countDocuments({ ...base, status: { $ne: "Resolved" } } as never),
      Ticket.countDocuments({ ...base, status: "Resolved" } as never),
      Ticket.findOne(base as never)
        .sort({ createdAt: -1 })
        .select("ticketNumber status")
        .lean(),
    ]);

    if (total === 0) {
      return urdu
        ? {
            reply:
              "Aapke paas abhi koi ticket nahi hai. 'New Ticket' se pehla ticket kholen — AI triage turant shuru ho jata hai.",
            suggestCreate: role === "customer",
          }
        : {
            reply:
              "You don't have any tickets yet. Open your first one from the 'New Ticket' button — AI triage kicks in instantly.",
            suggestCreate: role === "customer",
          };
    }

    const latestLine = newest
      ? urdu
        ? ` Sab se recent ticket ${newest.ticketNumber} hai — status: ${newest.status}.`
        : ` Your most recent ticket is ${newest.ticketNumber} — status: ${newest.status}.`
      : "";
    const en = `You have ${total} ticket${total === 1 ? "" : "s"} in total — ${open} open and ${resolved} resolved.${latestLine}`;
    const ud = `Aapke total ${total} ticket(s) hain — ${open} open hain aur ${resolved} resolved.${latestLine}`;
    return { reply: urdu ? ud : en, suggestCreate: false };
  } catch (err) {
    console.error("Ticket insight error:", err);
    return null;
  }
}

/**
 * SupportFlow concierge bot.
 * - Real LLM when AI_API_KEY is configured in .env (answers in the same
 *   language the user writes in, including Roman Urdu).
 * - Built-in knowledge base otherwise so the demo works offline.
 * - Answers "how many tickets / where is my ticket" with REAL ticket data.
 * - Voice + Roman Urdu are supported on the client (mic + text-to-speech).
 */
export async function POST(request: Request) {
  const rate = rateLimit(request, { limit: 30, windowMs: 60 * 1000 });
  if (!rate.ok) {
    return jsonError("Too many messages. Please try again in a moment.", 429, {
      retryAfter: rate.retryAfter,
    });
  }

  let body: { message?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body.");
  }

  const message = body.message?.trim() ?? "";
  if (!message) return jsonError("Message cannot be empty.");
  if (message.length > 1000)
    return jsonError("Message must be 1000 characters or fewer.");

  const user = await getAuthUser();
  const ctx = { userRole: user?.role ?? null };

  if (/ticket|complaint|complain|shikayat|status|kitne|kitni/i.test(message)) {
    const insight = await buildTicketInsight(
      user?.role ?? "customer",
      user?.id ?? "",
      detectRomanUrdu(message)
    );
    if (insight) return jsonOk(insight);
  }

  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    return jsonOk(matchIntent(message, ctx));
  }

  const baseUrl = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(
    /\/$/,
    ""
  );
  const model = process.env.AI_MODEL || "gpt-4o-mini";

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.5,
        max_tokens: 300,
        messages: [
          {
            role: "system",
            content:
              "You are the SupportFlow support concierge. Be friendly and concise (under 150 words). Answer questions about pricing, refunds, warranties, account access and ticket support. When a user needs help with a specific problem, direct them to open a support ticket. If the user writes in Roman Urdu (Urdu written in Latin/English letters, e.g. 'mujhe ticket kholna hai'), reply in Roman Urdu using the same style; if they write in English, reply in English.",
          },
          {
            role: "user",
            content: message,
          },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);
    if (!res.ok) return jsonOk(matchIntent(message, ctx));

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const reply = data.choices?.[0]?.message?.content?.trim();

    if (reply) {
      return jsonOk({
        reply,
        suggestCreate:
          /ticket|contact|agent|help|support/i.test(reply) &&
          ctx.userRole !== null,
      });
    }

    return jsonOk(matchIntent(message, ctx));
  } catch {
    return jsonOk(matchIntent(message, ctx));
  }
}