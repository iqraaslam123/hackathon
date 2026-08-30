"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DashLayout } from "./DashLayout";
import { StatsGrid } from "./StatsGrid";
import { TicketTable } from "./TicketTable";
import { MessageThread } from "./MessageThread";
import { StatusBadge, PriorityBadge } from "./Badges";
import { showError, showSuccess, confirmAction } from "@/lib/swal";
import { getSocket } from "@/lib/socket";
import { SpeakNotice } from "@/components/ui/SpeakNotice";
import {
  listTickets,
  listStats,
  createTicket,
  updateTicket,
  addTicketMessage,
  type TicketDTO,
  type StatsDTO,
} from "./ticketApi";
import { CATEGORIES } from "@/lib/ticketConstants";

export function CustomerDashboard({
  user,
}: {
  user: { name: string; email?: string | null };
}) {
  const [active, setActive] = useState("tickets");
  const [tickets, setTickets] = useState<TicketDTO[]>([]);
  const [stats, setStats] = useState<StatsDTO | null>(null);
  const [openTicket, setOpenTicket] = useState<TicketDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [live, setLive] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");

  const [form, setForm] = useState({ subject: "", description: "", category: "" });
  const [creating, setCreating] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    subject: "",
    description: "",
    category: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [notice, setNotice] = useState<{
    variant: "thanks" | "congrats";
    heading: string;
    sub: string;
    speakText: string;
    note?: string;
  } | null>(null);

  const listView = active === "tickets" && !openTicket;

  const refresh = useCallback(async () => {
    try {
      const [ticketsRes, statsRes] = await Promise.all([
        listTickets(statusFilter ? { status: statusFilter } : undefined),
        listStats(),
      ]);
      setTickets(ticketsRes.tickets);
      setStats(statsRes.stats);
      setError("");
    } catch (err) {
      setError((err as Error).message || "Could not load tickets.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const refreshTicket = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/tickets/${id}`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        setOpenTicket(data.ticket);
        return data.ticket as TicketDTO;
      }
    } catch {
      // keep last known state
    }
  }, []);

  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  const openTicketRef = useRef(openTicket);
  useEffect(() => {
    openTicketRef.current = openTicket;
  }, [openTicket]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Congratulate the customer when they log in after a complaint was resolved.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/notifications", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          notifications?: {
            id: string;
            type: string;
            read: boolean;
            message: string;
          }[];
        };
        const resolved = (data.notifications ?? []).filter(
          (n) =>
            !n.read &&
            n.type === "ticket_update" &&
            /resolved/i.test(n.message)
        );
        if (!cancelled && resolved.length > 0) {
          setNotice({
            variant: "congrats",
            heading: "Mubarak ho! 🎉",
            sub: "Aapki complaint successfully hal ho gayi hai! Hum ummeed karte hain ke hamari support se aap khush hain. Agar mazeed koi masla ho toh naya ticket khol sakte hain.",
            speakText:
              "Mubarak ho! Aapki complaint successfully hal ho gayi hai. Hum ummeed karte hain ke hamari support se aap khush hain.",
            note: resolved[0].message,
          });
          await Promise.all(
            resolved.map((n) =>
              fetch("/api/notifications", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: n.id }),
              }).catch(() => {})
            )
          );
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    getSocket()
      .then((socket) => {
        if (!mounted) return;
        socket.on("connect", () => setLive(true));
        socket.on("disconnect", () => setLive(false));
        const handle = (ev?: { id?: string }) => {
          const id = ev?.id ?? openTicketRef.current?.id;
          setTimeout(() => {
            refreshRef.current();
            if (id) refreshTicket(id);
          }, 250);
        };
        socket.on("ticket:update", handle);
        socket.on("ticket:message", handle);
        socket.on("ticket:new", handle);
        if (socket.connected) setLive(true);
      })
      .catch(() => setLive(false));

    return () => {
      mounted = false;
    };
  }, []);

  // Join/leave the room for the currently open ticket.
  useEffect(() => {
    if (!openTicket) return;
    let socket: Awaited<ReturnType<typeof getSocket>> | null = null;
    getSocket()
      .then((s) => {
        socket = s;
        s.emit("ticket:join", { ticketId: openTicket.id });
      })
      .catch(() => {});
    return () => {
      socket?.emit("ticket:leave", { ticketId: openTicket.id });
    };
  }, [openTicket?.id]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.subject.trim() || !form.description.trim()) {
      await showError("Missing details", "Please fill in the subject and description.");
      return;
    }
    setCreating(true);
    setError("");
    try {
      const res = await createTicket({
        subject: form.subject.trim(),
        description: form.description.trim(),
        category: form.category || undefined,
      });
      setForm({ subject: "", description: "", category: "" });
      setTickets((t) => [res.ticket, ...t]);
      setOpenTicket(res.ticket);
      await showSuccess(
        "Ticket submitted",
        `${res.ticket.ticketNumber} was created. AI triage has analyzed it and is ready for agent review.`
      );
      setNotice({
        variant: "thanks",
        heading: "Shukriya! Complaint Submitted",
        sub: "Aapki complaint successfully submit ho gayi hai. AI ne iska analysis kar liya hai aur hamari support team jald hi aap se raabta karegi.",
        speakText:
          "Shukriya! Aapki complaint successfully submit ho gayi hai. Hamari support team jald hi aap se raabta karegi.",
        note: `${res.ticket.ticketNumber} — ${res.ticket.category}`,
      });
      try {
        const statsRes = await listStats();
        setStats(statsRes.stats);
      } catch {
        // non-fatal
      }
    } catch (err) {
      await showError("Could not create ticket", (err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!openTicket || !reply.trim()) return;
    setSending(true);
    try {
      const res = await addTicketMessage(openTicket.id, reply.trim());
      setOpenTicket(res.ticket);
      setReply("");
      refresh();
    } catch (err) {
      await showError("Could not send message", (err as Error).message);
    } finally {
      setSending(false);
    }
  }

  function openDetail(ticket: TicketDTO) {
    setOpenTicket(ticket);
    setEditing(false);
  }

  function startEdit() {
    if (!openTicket) return;
    setEditForm({
      subject: openTicket.subject,
      description: openTicket.description,
      category: openTicket.category,
    });
    setEditing(true);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!openTicket) return;
    if (!editForm.subject.trim() || !editForm.description.trim()) {
      await showError("Missing details", "Subject and description are required.");
      return;
    }
    setSavingEdit(true);
    try {
      const res = await updateTicket(openTicket.id, {
        subject: editForm.subject.trim(),
        description: editForm.description.trim(),
        category: editForm.category || undefined,
      });
      setOpenTicket(res.ticket);
      setEditing(false);
      refresh();
      await showSuccess("Complaint updated", "Your changes were saved.");
    } catch (err) {
      await showError("Could not save changes", (err as Error).message);
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete() {
    if (!openTicket) return;
    const confirmed = await confirmAction(
      "Delete this complaint?",
      "This will permanently remove the ticket. This can only be done while the ticket is still new and unassigned.",
      "Yes, delete"
    );
    if (!confirmed) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/tickets/${openTicket.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not delete ticket.");
      const deletedId = openTicket.id;
      setOpenTicket(null);
      setTickets((t) => t.filter((x) => x.id !== deletedId));
      refresh();
      await showSuccess("Ticket deleted", "Your complaint was removed.");
    } catch (err) {
      await showError("Could not delete ticket", (err as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  const navItems = [
    { id: "tickets", label: "My Tickets" },
    { id: "new", label: "New Ticket" },
  ];

  return (
    <DashLayout
      user={user}
      role="customer"
      navItems={navItems}
      active={openTicket ? "tickets" : active}
      onNavigate={(id) => {
        setOpenTicket(null);
        setActive(id);
        setError("");
      }}
      live={live}
    >
      {openTicket ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={() => setOpenTicket(null)}
              className="btn-outline w-auto! px-4! text-sm"
            >
              ← Back to tickets
            </button>
            <div className="flex flex-wrap items-center gap-2">
              {openTicket.status === "New" ? (
                <>
                  <button
                    onClick={startEdit}
                    disabled={savingEdit}
                    className="btn-outline w-auto! px-4! text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="btn-outline w-auto! px-4! text-sm border-rose-400/40 text-rose-200 hover:bg-rose-500/10"
                  >
                    {deleting ? "Deleting..." : "Delete"}
                  </button>
                </>
              ) : null}
              <PriorityBadge priority={openTicket.priority} />
              <StatusBadge status={openTicket.status} />
            </div>
          </div>

          <div className="card-in space-y-4">
            {editing ? (
              <form
                onSubmit={saveEdit}
                className="space-y-3 rounded-xl border border-amber-300/30 bg-amber-500/10 p-4"
              >
                <h3 className="text-sm font-semibold text-amber-200">
                  Edit complaint
                </h3>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-white/70">
                    Subject
                  </label>
                  <input
                    value={editForm.subject}
                    onChange={(e) =>
                      setEditForm({ ...editForm, subject: e.target.value })
                    }
                    maxLength={200}
                    className="input-outline text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-white/70">
                    Description
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm({ ...editForm, description: e.target.value })
                    }
                    rows={4}
                    maxLength={5000}
                    className="input-outline resize-none text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-white/70">
                    Category
                  </label>
                  <select
                    value={editForm.category}
                    onChange={(e) =>
                      setEditForm({ ...editForm, category: e.target.value })
                    }
                    className="input-outline text-sm"
                  >
                    <option value="">General Inquiry</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="btn-primary w-auto! px-4! text-xs"
                  >
                    {savingEdit ? "Saving..." : "Save changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="btn-outline w-auto! px-4! text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : null}

            <div>
              <p className="font-mono text-xs text-grad-yellow">
                {openTicket.ticketNumber}
              </p>
              <h2 className="text-2xl font-bold">{openTicket.subject}</h2>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/60">
                <span>Category: {openTicket.category}</span>
                <span>
                  Agent:{" "}
                  {openTicket.assignedAgent?.name ?? "Not assigned yet"}
                </span>
                <span>
                  Created:{" "}
                  {openTicket.createdAt
                    ? new Date(openTicket.createdAt).toLocaleString()
                    : ""}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h3 className="mb-1 text-sm font-semibold text-white/85">
                Issue description
              </h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/80">
                {openTicket.description}
              </p>
            </div>

            {openTicket.aiCategory || openTicket.aiSummary ? (
              <div className="rounded-xl border border-violet-300/30 bg-violet-500/10 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-violet-200">
                    AI Triage suggestion
                  </h3>
                  <span className="text-[11px] text-violet-200/70">
                    {openTicket.aiReviewed ? "Approved by agent" : "Awaiting agent review"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-white/80">
                  <span className="text-white/50">Category:</span>{" "}
                  {openTicket.aiCategory || "—"}
                  <span className="ml-4 text-white/50">Priority:</span>{" "}
                  {openTicket.aiPriority || "—"}
                </p>
                {openTicket.aiSummary ? (
                  <p className="mt-1 text-sm italic text-white/70">
                    “{openTicket.aiSummary}”
                  </p>
                ) : null}
              </div>
            ) : null}

            {openTicket.resolutionNote ? (
              <div className="rounded-xl border border-emerald-300/30 bg-emerald-500/10 p-4">
                <h3 className="text-sm font-semibold text-emerald-200">
                  Resolution note
                </h3>
                <p className="mt-1 whitespace-pre-wrap text-sm text-white/80">
                  {openTicket.resolutionNote}
                </p>
              </div>
            ) : null}

            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h3 className="mb-3 text-sm font-semibold text-white/85">
                Conversation
              </h3>
              <MessageThread messages={openTicket.messages} mineSender="customer" />

              {openTicket.status === "Resolved" ? (
                <p className="mt-4 rounded-lg border border-emerald-300/30 bg-emerald-500/10 p-3 text-center text-sm text-emerald-200">
                  This ticket is resolved. Please open a new ticket if you need
                  further help.
                </p>
              ) : (
                <form onSubmit={handleReply} className="mt-4 space-y-3">
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    rows={3}
                    placeholder="Write a message to your support agent..."
                    className="input-outline resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={sending || !reply.trim()}
                      className="btn-primary w-auto! px-6! text-sm"
                    >
                      {sending ? "Sending..." : "Send message"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      ) : listView ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">My Tickets</h1>
              <p className="text-sm text-white/60">
                Track, message and manage your support requests.
              </p>
            </div>
            <button
              onClick={() => setActive("new")}
              className="btn-primary w-auto! px-6! text-sm"
            >
              + New Ticket
            </button>
          </div>

          <StatsGrid stats={stats} />

          {error ? <p className="alert-error">{error}</p> : null}

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-outline w-auto! text-sm"
            >
              <option value="">All statuses</option>
              <option value="New">New</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-white/60">
              <span className="spinner" /> Loading tickets...
            </div>
          ) : (
            <TicketTable
              tickets={tickets}
              onSelect={openDetail}
              emptyMessage="You have no tickets yet. Create one to get support."
            />
          )}
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold">New Support Ticket</h1>
            <p className="text-sm text-white/60">
              Describe your issue. AI triage will suggest a category, priority
              and summary for the team to review.
            </p>
          </div>

          {error ? <p className="alert-error">{error}</p> : null}

          <form onSubmit={handleCreate} className="card-in space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
            <div className="space-y-1.5">
              <label htmlFor="subject" className="block text-sm font-medium text-white/85">
                Subject
              </label>
              <input
                id="subject"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Short summary of your issue"
                className="input-outline"
                maxLength={200}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="description" className="block text-sm font-medium text-white/85">
                Description
              </label>
              <textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe the issue in as much detail as possible..."
                className="input-outline resize-none"
                rows={6}
                maxLength={5000}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="category" className="block text-sm font-medium text-white/85">
                Category <span className="text-white/40">(optional — AI can suggest)</span>
              </label>
              <select
                id="category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="input-outline text-sm"
              >
                <option value="">Auto (AI suggestion)</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end pt-1">
              <button type="submit" disabled={creating} className="btn-primary w-auto! px-8! text-sm">
                {creating ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="spinner" /> Analyzing with AI...
                  </span>
                ) : (
                  "Submit Ticket"
                )}
              </button>
            </div>
          </form>
        </div>
      )}
      <SpeakNotice
        open={!!notice}
        variant={notice?.variant ?? "thanks"}
        heading={notice?.heading ?? ""}
        sub={notice?.sub ?? ""}
        speakText={notice?.speakText ?? ""}
        note={notice?.note}
        onClose={() => setNotice(null)}
      />
    </DashLayout>
  );
}