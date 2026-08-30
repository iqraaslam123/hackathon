"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket";

type Notify = {
  id: string;
  type: string;
  message: string;
  ticketId: string | null;
  read: boolean;
  createdAt?: string | null;
};

const DEST: Record<string, string> = {
  customer: "/dashboard/customer",
  agent: "/dashboard/agent",
  admin: "/dashboard/admin",
};

export function NotificationBell({
  role,
  muted = false,
}: {
  role: string;
  muted?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notify[]>([]);
  const [unread, setUnread] = useState(0);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | null>(null);

  const showToast = useCallback((message: string) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(""), 4500);
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        setItems(data.notifications ?? []);
        setUnread(data.unreadCount ?? 0);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 30000);
    let socket: { off: (event: string) => void } | null = null;
    getSocket()
      .then((s) => {
        socket = s;
        s.on("notification:new", (n?: Notify) => {
          if (!n) return;
          setItems((prev) => [n, ...prev].slice(0, 50));
          setUnread((u) => u + 1);
          if (!muted) showToast(n.message);
        });
      })
      .catch(() => {});
    return () => {
      window.clearInterval(timer);
      socket?.off("notification:new");
    };
  }, [load, muted, showToast]);

  async function markRead(id?: string, all?: boolean) {
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(all ? { all: true } : { id }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setUnread(data.unreadCount ?? 0);
      if (all) {
        setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      } else if (id) {
        setItems((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
      }
    } catch {
      // ignore
    }
  }

  function openNotification(n: Notify) {
    if (!n.read) markRead(n.id);
    setOpen(false);
    router.push(DEST[role] ?? "/dashboard");
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative rounded-xl border border-white/15 bg-white/5 p-2.5 text-white/80 transition-colors hover:border-grad-yellow/60 hover:text-white"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-grad-red to-grad-orange px-1 text-[10px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-white/15 bg-[#2a0a18] shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <span className="text-sm font-bold">Notifications</span>
            {unread > 0 ? (
              <button
                onClick={() => markRead(undefined, true)}
                className="text-[11px] text-grad-yellow hover:underline"
              >
                Mark all read
              </button>
            ) : null}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-white/50">
                No notifications yet.
              </p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => openNotification(n)}
                  className={`block w-full border-b border-white/5 px-4 py-3 text-left transition-colors hover:bg-white/5 ${
                    n.read ? "" : "bg-amber-500/10"
                  }`}
                >
                  <p className="text-sm leading-snug text-white/90">
                    {n.message}
                  </p>
                  <p className="mt-1 text-[11px] text-white/40">
                    {n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}
                    {!n.read ? " · New" : ""}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed left-1/2 top-4 z-50 w-auto max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-xl border border-grad-yellow/40 bg-[#2a0a18] px-4 py-3 text-sm text-white shadow-2xl">
          {toast}
        </div>
      ) : null}
    </div>
  );
}