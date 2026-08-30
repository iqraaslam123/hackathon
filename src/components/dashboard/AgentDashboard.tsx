"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DashLayout } from "./DashLayout";
import { StatsGrid } from "./StatsGrid";
import { TicketTable } from "./TicketTable";
import { MessageThread } from "./MessageThread";
import { StatusBadge, PriorityBadge } from "./Badges";
import { showError, showSuccess } from "@/lib/swal";
import { getSocket } from "@/lib/socket";
import {
  listTickets,
  listStats,
  updateTicket,
  addTicketMessage,
  regenerateTriage,
  type TicketDTO,
  type StatsDTO,
} from "./ticketApi";
import { CATEGORIES, PRIORITIES, STATUSES } from "@/lib/ticketConstants";

export function AgentDashboard({
  user,
}: {
  user: { id: string; name: string; email?: string | null };
}) {
  const [tickets, setTickets] = useState<TicketDTO[]>([]);
  const [stats, setStats] = useState<StatsDTO | null>(null);
  const [openTicket, setOpenTicket] = useState<TicketDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [live, setLive] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");

  const [aiForm, setAiForm] = useState({ aiCategory: "", aiPriority: "", aiSummary: "" });
  const [aiBusy, setAiBusy] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("New");
  const [resolutionNote, setResolutionNote] = useState("");
  const [statusBusy, setStatusBusy] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

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

  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  const openTicketRef = useRef(openTicket);
  useEffect(() => {
    openTicketRef.current = openTicket;
  }, [openTicket]);

  const refreshTicket = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/tickets/${id}`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setOpenTicket(data.ticket);
    } catch {
      // keep last known state
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

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
            if (id && openTicketRef.current?.id === id) refreshTicket(id);
          }, 250);
        };
        socket.on("ticket:new", handle);
        socket.on("ticket:update", handle);
        socket.on("ticket:message", handle);
        if (socket.connected) setLive(true);
      })
      .catch(() => setLive(false));
    return () => {
      mounted = false;
    };
  }, []);

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

  async function openDetail(ticket: TicketDTO) {
    setOpenTicket(ticket);
    setSelectedStatus(ticket.status);
    setResolutionNote(ticket.resolutionNote || "");
    setAiForm({
      aiCategory: ticket.aiCategory || "",
      aiPriority: ticket.aiPriority || "",
      aiSummary: ticket.aiSummary || "",
    });
  }

  async function handleDoneTicketUpdate(updated: TicketDTO) {
    setOpenTicket(updated);
    setSelectedStatus(updated.status);
    setResolutionNote(updated.resolutionNote || "");
    refresh();
  }

  async function handleSaveAi(kind: "draft" | "approve") {
    if (!openTicket) return;
    setAiBusy(true);
    try {
      const res = await updateTicket(openTicket.id, {
        aiCategory: aiForm.aiCategory,
        aiPriority: aiForm.aiPriority,
        aiSummary: aiForm.aiSummary,
        ...(kind === "approve" ? { aiReviewed: true } : {}),
      });
      await handleDoneTicketUpdate(res.ticket);
      if (kind === "approve") {
        await showSuccess(
          "AI result approved",
          "The final category, priority and summary were published to the ticket."
        );
      }
    } catch (err) {
      await showError("Could not save AI result", (err as Error).message);
    } finally {
      setAiBusy(false);
    }
  }

  async function handleRegenerate() {
    if (!openTicket) return;
    setAiBusy(true);
    try {
      const res = await regenerateTriage(openTicket.id);
      setOpenTicket(res.ticket);
      setAiForm({
        aiCategory: res.ticket.aiCategory || "",
        aiPriority: res.ticket.aiPriority || "",
        aiSummary: res.ticket.aiSummary || "",
      });
      await showSuccess(
        "AI suggestion regenerated",
        `Category: ${res.ticket.aiCategory}, Priority: ${res.ticket.aiPriority}`
      );
    } catch (err) {
      await showError("Could not regenerate", (err as Error).message);
    } finally {
      setAiBusy(false);
    }
  }

  async function handleAssignToMe() {
    if (!openTicket) return;
    try {
      const res = await updateTicket(openTicket.id, { assignedAgent: user.id });
      await handleDoneTicketUpdate(res.ticket);
      await showSuccess("Ticket assigned", "This ticket is now assigned to you.");
    } catch (err) {
      await showError("Could not assign ticket", (err as Error).message);
    }
  }

  async function handleStatusChange() {
    if (!openTicket) return;
    setStatusBusy(true);
    try {
      const payload: Record<string, unknown> = { status: selectedStatus };
      if (selectedStatus === "Resolved") {
        if (!resolutionNote.trim()) {
          await showError(
            "Resolution note required",
            "A ticket cannot be resolved unless you provide a resolution note."
          );
          return;
        }
        payload.resolutionNote = resolutionNote.trim();
      }
      const res = await updateTicket(openTicket.id, payload);
      await handleDoneTicketUpdate(res.ticket);
      await showSuccess(
        "Status updated",
        `${openTicket.ticketNumber} is now ${res.ticket.status}.`
      );
    } catch (err) {
      await showError("Could not update status", (err as Error).message);
    } finally {
      setStatusBusy(false);
    }
  }

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!openTicket || !reply.trim()) return;
    setSending(true);
    try {
      const res = await addTicketMessage(openTicket.id, reply.trim());
      await handleDoneTicketUpdate(res.ticket);
      setReply("");
    } catch (err) {
      await showError("Could not send message", (err as Error).message);
    } finally {
      setSending(false);
    }
  }

  const navItems = [{ id: "dashboard", label: "Agent Queue" }];

  return (
    <DashLayout
      user={{ name: user.name, email: user.email }}
      role="agent"
      navItems={navItems}
      active="dashboard"
      onNavigate={() => setOpenTicket(null)}
      live={live}
    >
      {openTicket ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={() => setOpenTicket(null)}
              className="btn-outline w-auto! px-4! text-sm"
            >
              ← Back to queue
            </button>
            <div className="flex items-center gap-2">
              <PriorityBadge priority={openTicket.priority} />
              <StatusBadge status={openTicket.status} />
            </div>
          </div>

          <div className="card-in grid gap-5 lg:grid-cols-2">
            {/* LEFT: issue + AI triage */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="font-mono text-xs text-grad-yellow">
                  {openTicket.ticketNumber}
                </p>
                <h2 className="text-xl font-bold">{openTicket.subject}</h2>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/60">
                  <span>Customer: {openTicket.customer?.name ?? "—"}</span>
                  <span>Category: {openTicket.category}</span>
                  <span>
                    Agent: {openTicket.assignedAgent?.name ?? "Unassigned"}
                  </span>
                </div>
                <p className="mt-3 whitespace-pre-wrap rounded-xl border border-white/10 bg-black/20 p-4 text-sm leading-relaxed text-white/85">
                  {openTicket.description}
                </p>
              </div>

              <div className="rounded-2xl border border-violet-300/30 bg-violet-500/10 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold text-violet-200">AI Triage review</h3>
                  <span className="text-[11px] text-violet-200/70">
                    {openTicket.aiReviewed
                      ? "Approved — published to ticket"
                      : "Not yet approved"}
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-violet-100/70">
                      AI Category
                    </label>
                    <select
                      value={aiForm.aiCategory}
                      onChange={(e) =>
                        setAiForm({ ...aiForm, aiCategory: e.target.value })
                      }
                      className="input-outline text-sm"
                    >
                      <option value="">—</option>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-violet-100/70">
                      AI Priority
                    </label>
                    <select
                      value={aiForm.aiPriority}
                      onChange={(e) =>
                        setAiForm({ ...aiForm, aiPriority: e.target.value })
                      }
                      className="input-outline text-sm"
                    >
                      <option value="">—</option>
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-violet-100/70">
                      AI Summary
                    </label>
                    <textarea
                      value={aiForm.aiSummary}
                      onChange={(e) =>
                        setAiForm({ ...aiForm, aiSummary: e.target.value })
                      }
                      rows={2}
                      maxLength={500}
                      className="input-outline resize-none text-sm"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleSaveAi("draft")}
                      disabled={aiBusy}
                      className="btn-outline w-auto! px-4! text-xs"
                    >
                      {aiBusy ? "Saving..." : "Save draft"}
                    </button>
                    <button
                      onClick={() => handleSaveAi("approve")}
                      disabled={aiBusy}
                      className="btn-primary w-auto! px-4! text-xs"
                    >
                      {aiBusy ? "Saving..." : "Approve & publish"}
                    </button>
                    <button
                      onClick={handleRegenerate}
                      disabled={aiBusy}
                      className="btn-outline w-auto! px-4! text-xs"
                    >
                      Regenerate with AI
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: status + conversation */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h3 className="mb-3 font-semibold">Status & assignment</h3>
                {!openTicket.assignedAgent ? (
                  <button
                    onClick={handleAssignToMe}
                    className="btn-primary mb-4 w-auto! px-4! text-xs"
                  >
                    Assign to me & set Assigned
                  </button>
                ) : null}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-white/70">
                      Status
                    </label>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="input-outline text-sm"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedStatus === "Resolved" ? (
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-emerald-200/80">
                        Resolution note (required to resolve)
                      </label>
                      <textarea
                        value={resolutionNote}
                        onChange={(e) => setResolutionNote(e.target.value)}
                        rows={3}
                        placeholder="Explain how the issue was resolved for the customer..."
                        className="input-outline resize-none text-sm"
                      />
                    </div>
                  ) : null}
                  <button
                    onClick={handleStatusChange}
                    disabled={statusBusy}
                    className="btn-primary w-auto! px-4! text-xs"
                  >
                    {statusBusy ? "Updating..." : "Update status"}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h3 className="mb-3 font-semibold">Conversation</h3>
                <MessageThread messages={openTicket.messages} mineSender="agent" />
                <form onSubmit={handleReply} className="mt-4 space-y-3">
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    rows={3}
                    placeholder="Reply to the customer..."
                    className="input-outline resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={sending || !reply.trim()}
                      className="btn-primary w-auto! px-6! text-xs"
                    >
                      {sending ? "Sending..." : "Send reply"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold">Agent Queue</h1>
            <p className="text-sm text-white/60">
              New tickets and tickets assigned to you.
            </p>
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
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-white/60">
              <span className="spinner" /> Loading queue...
            </div>
          ) : (
            <TicketTable
              tickets={tickets}
              onSelect={openDetail}
              showCustomer
              emptyMessage="No tickets in the queue right now."
            />
          )}
        </div>
      )}
    </DashLayout>
  );
}