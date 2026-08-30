export const CATEGORIES = [
  "Billing",
  "Account Access",
  "Technical Support",
  "Order & Shipping",
  "Product Info",
  "General Inquiry",
  "Other",
] as const;

export const PRIORITIES = ["Low", "Medium", "High"] as const;

export const STATUSES = ["New", "Assigned", "In Progress", "Resolved"] as const;

export const MESSAGE_SENDERS = ["customer", "agent", "system"] as const;

export type Category = (typeof CATEGORIES)[number];
export type Priority = (typeof PRIORITIES)[number];
export type TicketStatus = (typeof STATUSES)[number];
export type MessageSender = (typeof MESSAGE_SENDERS)[number];

export function isCategory(value: unknown): value is Category {
  return typeof value === "string" && (CATEGORIES as readonly string[]).includes(value);
}

export function isPriority(value: unknown): value is Priority {
  return typeof value === "string" && (PRIORITIES as readonly string[]).includes(value);
}

export function isStatus(value: unknown): value is TicketStatus {
  return typeof value === "string" && (STATUSES as readonly string[]).includes(value);
}

export const STATUS_COLORS: Record<TicketStatus, string> = {
  New: "border-sky-300/50 bg-sky-500/15 text-sky-200",
  Assigned: "border-indigo-300/50 bg-indigo-500/15 text-indigo-200",
  "In Progress": "border-amber-300/50 bg-amber-500/15 text-amber-200",
  Resolved: "border-emerald-300/50 bg-emerald-500/15 text-emerald-200",
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  High: "border-red-300/50 bg-red-500/15 text-red-200",
  Medium: "border-amber-300/50 bg-amber-500/15 text-amber-200",
  Low: "border-emerald-300/50 bg-emerald-500/15 text-emerald-200",
};