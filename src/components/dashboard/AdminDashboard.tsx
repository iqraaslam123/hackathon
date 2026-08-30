"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DashLayout } from "./DashLayout";
import { StatsGrid } from "./StatsGrid";
import { TicketTable } from "./TicketTable";
import { MessageThread } from "./MessageThread";
import { StatusBadge, PriorityBadge } from "./Badges";
import { getSocket } from "@/lib/socket";
import {
  listTickets,
  listStats,
  type TicketDTO,
  type StatsDTO,
} from "./ticketApi";
import { STATUSES } from "@/lib/ticketConstants";

export function AdminDashboard({
  user,
}: {
  user: { name: string; email?: string | null };
}) {
  const [tickets, setTickets] = useState<TicketDTO[]>([]);
  const [stats, setStats] = useState<StatsDTO | null>(null);
  const [openTicket, setOpenTicket] = useState<TicketDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [live, setLive] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");

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

  const navItems = [{ id: "overview", label: "All Tickets" }];

  return (
    <DashLayout
      user={user}
      role="admin"
      navItems={navItems}
      active="overview"
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
              ← Back to overview
            </button>
            <div className="flex items-center gap-2">
              <PriorityBadge priority={openTicket.priority} />
              <StatusBadge status={openTicket.status} />
            </div>
          </div>

          <div className="card-in grid gap-5 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="font-mono text-xs text-grad-yellow">
                  {openTicket.ticketNumber}
                </p>
                <h2 className="text-xl font-bold">{openTicket.subject}</h2>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/60">
                  <span>Customer: {openTicket.customer?.name ?? "—"}</span>
                  <span>Agent: {openTicket.assignedAgent?.name ?? "Unassigned"}</span>
                  <span>Category: {openTicket.category}</span>
                  <span>
                    Created:{" "}
                    {openTicket.createdAt
                      ? new Date(openTicket.createdAt).toLocaleString()
                      : ""}
                  </span>
                </div>
                <p className="mt-3 whitespace-pre-wrap rounded-xl border border-white/10 bg-black/20 p-4 text-sm leading-relaxed text-white/85">
                  {openTicket.description}
                </p>
              </div>

              {openTicket.aiCategory || openTicket.aiSummary ? (
                <div className="rounded-2xl border border-violet-300/30 bg-violet-500/10 p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-violet-200">AI Triage</h3>
                    <span className="text-[11px] text-violet-200/70">
                      {openTicket.aiReviewed ? "Approved" : "Not reviewed"}
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
                <div className="rounded-2xl border border-emerald-300/30 bg-emerald-500/10 p-5">
                  <h3 className="font-semibold text-emerald-200">Resolution note</h3>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-white/80">
                    {openTicket.resolutionNote}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <h3 className="mb-3 font-semibold">Conversation</h3>
              <MessageThread messages={openTicket.messages} mineSender="customer" />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold">Support Overview</h1>
            <p className="text-sm text-white/60">
              Statistics and every ticket in the system.
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
              <span className="spinner" /> Loading tickets...
            </div>
          ) : (
            <TicketTable
              tickets={tickets}
              onSelect={setOpenTicket}
              showCustomer
              emptyMessage="No tickets in the system yet."
            />
          )}
        </div>
      )}
    </DashLayout>
  );
}