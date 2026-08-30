export type MessageDTO = {
  id?: string;
  sender: "customer" | "agent" | "system";
  senderName?: string;
  message: string;
  createdAt?: string | Date;
};

export type TicketDTO = {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  aiCategory: string;
  aiPriority: string;
  aiSummary: string;
  aiReviewed: boolean;
  status: string;
  resolutionNote: string;
  customer?: { id: string; name: string; email?: string } | null;
  assignedAgent?: { id: string; name: string } | null;
  messages: MessageDTO[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export type StatsDTO = {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  highPriority: number;
  [key: string]: number;
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = (await res.json().catch(() => ({}))) as { message?: string } & T;
  if (!res.ok) {
    throw new ApiError(data.message || "Request failed.", res.status);
  }
  return data;
}

export function listTickets(params?: { status?: string }) {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  const suffix = q.toString() ? `?${q.toString()}` : "";
  return request<{ tickets: TicketDTO[] }>(`/api/tickets${suffix}`);
}

export function listStats() {
  return request<{ stats: StatsDTO }>("/api/tickets/stats");
}

export function getTicket(id: string) {
  return request<{ ticket: TicketDTO }>(`/api/tickets/${id}`);
}

export function createTicket(payload: {
  subject: string;
  description: string;
  category?: string;
}) {
  return request<{ ticket: TicketDTO }>(`/api/tickets`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateTicket(
  id: string,
  payload: Record<string, unknown>
) {
  return request<{ ticket: TicketDTO }>(`/api/tickets/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function addTicketMessage(id: string, message: string) {
  return request<{ ticket: TicketDTO }>(`/api/tickets/${id}/messages`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export function regenerateTriage(id: string) {
  return request<{ triage: { category: string; priority: string; summary: string }; ticket: TicketDTO }>(
    `/api/tickets/${id}/triage`,
    { method: "POST" }
  );
}