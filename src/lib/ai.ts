import {
  CATEGORIES,
  isCategory,
  isPriority,
  type Category,
  type Priority,
} from "@/lib/ticketConstants";

export type TriageResult = {
  category: Category;
  priority: Priority;
  summary: string;
};

const CATEGORY_PROFILES: {
  category: Category;
  priority: Priority;
  summary: string;
  keywords: string[];
}[] = [
  {
    category: "Billing",
    priority: "High",
    summary: "Possible payment or billing issue reported by customer.",
    keywords: [
      "bill", "billing", "charged", "charge", "refund", "payment", "paid",
      "invoice", "receipt", "overcharge", "double charge", "double-charge",
      "card", "debit", "credit", "fee", "subscription payment", "cancelled payment",
      "charged twice", "charged twice for",
    ],
  },
  {
    category: "Account Access",
    priority: "High",
    summary: "Customer reporting an account access or login problem.",
    keywords: [
      "login", "log in", "sign in", "signin", "password", "locked out",
      "locked", "reset password", "2fa", "two factor", "otp", "verification code",
      "verify", "authenticate", "access", "hacked", "unauthorized", "session",
      "can't log in", "cannot login", "account access",
    ],
  },
  {
    category: "Technical Support",
    priority: "Medium",
    summary: "Customer reporting a technical fault or product malfunction.",
    keywords: [
      "error", "bug", "crash", "broken", "not working", "doesn't work",
      "does not work", "failed", "failure", "exception", "hangs", "freeze",
      "frozen", "install", "update failed", "configure", "api", "server down",
      "slow", "404", "500", "stuck", "blank screen", "whitescreen",
    ],
  },
  {
    category: "Order & Shipping",
    priority: "Medium",
    summary: "Customer enquiring about an order or shipment status.",
    keywords: [
      "order", "shipping", "delivery", "shipment", "track", "tracking",
      "arrive", "arrived", "received", "delay", "package", "dispatch",
      "delivered", "missing order", "not delivered",
    ],
  },
  {
    category: "Product Info",
    priority: "Low",
    summary: "Customer asking for product information or guidance.",
    keywords: [
      "what is", "how to", "how do i", "warranty", "specification", "specs",
      "feature", "compatible", "manual", "guide", "return policy", "usage",
    ],
  },
];

function fallsback(subject: string, description: string): TriageResult {
  const text = `${subject} ${description}`.toLowerCase();

  let best = CATEGORY_PROFILES[CATEGORY_PROFILES.length - 1];
  let bestScore = 0;

  for (const profile of CATEGORY_PROFILES) {
    const score = profile.keywords.reduce((acc, w) => {
      return acc + (text.includes(w) ? 1 : 0);
    }, 0);
    if (score > bestScore) {
      bestScore = score;
      best = profile;
    }
  }

  if (bestScore === 0) {
    return {
      category: "General Inquiry",
      priority: "Medium",
      summary:
        "General inquiry received; no specific category or priority detected automatically.",
    };
  }

  return {
    category: best.category,
    priority: best.priority,
    summary: best.summary,
  };
}

function parseJsonResponse(content: string): TriageResult | null {
  try {
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    const parsed = JSON.parse(content.slice(start, end + 1)) as Record<string, unknown>;

    const category = parsed.category ?? "";
    const priority = parsed.priority ?? "";
    const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";

    if (!isCategory(category) || !isPriority(priority)) return null;

    const validCategory = CATEGORIES.find((c) => c === category);
    return {
      category: category as Category,
      priority: priority as Priority,
      summary:
        summary ||
        `Customer issue categorized under ${validCategory ?? "General Inquiry"}.`,
    };
  } catch {
    return null;
  }
}

/**
 * Runs AI triage on a ticket's subject + description and always returns a
 * result. When an `AI_API_KEY` is configured it calls an OpenAI-compatible
 * endpoint; otherwise (or on any failure/timeout) a keyword-based fallback is
 * used so the ticket is still created and manually handled.
 *
 * The AI API key stays server-side (env only) and is never exposed to the client.
 */
export async function runTriage(
  subject: string,
  description: string
): Promise<TriageResult> {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) return fallsback(subject, description);

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
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a customer-support ticket triage assistant. Given a ticket's subject and description, reply with ONLY a JSON object of the shape {\"category\": string, \"priority\": \"Low\"|\"Medium\"|\"High\", \"summary\": string}. Category must be one of: Billing, Account Access, Technical Support, Order & Shipping, Product Info, General Inquiry, Other.",
          },
          {
            role: "user",
            content: `Subject: ${subject}\n\nDescription: ${description}`,
          },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);
    if (!res.ok) return fallsback(subject, description);

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;

    if (content) {
      const parsed = parseJsonResponse(content);
      if (parsed) return parsed;
    }

    return fallsback(subject, description);
  } catch {
    return fallsback(subject, description);
  }
}