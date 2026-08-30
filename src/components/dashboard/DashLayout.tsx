"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { confirmAction, showSuccess } from "@/lib/swal";
import { resetSocket } from "@/lib/socket";
import { ChatBot } from "@/components/chat/ChatBot";
import { HexLogo } from "@/components/auth/HexLogo";
import { RoleBadge, LiveChip } from "./Badges";
import { NotificationBell } from "./NotificationBell";
import { Reveal } from "@/components/motion/Reveal";

export type DashNavItem = { id: string; label: string };

export function DashLayout({
  user,
  role,
  navItems,
  active,
  onNavigate,
  live,
  children,
}: {
  user: { name: string; email?: string | null };
  role: string;
  navItems: DashNavItem[];
  active: string;
  onNavigate: (id: string) => void;
  live: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  async function logout() {
    const confirmed = await confirmAction(
      "Log out?",
      "Are you sure you want to sign out of SupportFlow?",
      "Yes, log out"
    );
    if (!confirmed) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      resetSocket();
      await showSuccess("Logged out", "See you soon!");
      router.push("/login");
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  }

  const sidebar = (
    <div className="flex h-full flex-col p-4">
      <div className="flex items-center gap-3 px-2 pt-1">
        <HexLogo className="h-10 w-10" />
        <div>
          <p className="text-sm font-extrabold tracking-tight">SupportFlow</p>
          <p className="text-[11px] text-white/50">Support Desk</p>
        </div>
      </div>

      <nav className="mt-8 space-y-1">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <span aria-hidden="true">←</span> Back to home
        </Link>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              onNavigate(item.id);
              setMenuOpen(false);
            }}
            className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
              active === item.id
                ? "bg-gradient-to-r from-grad-orange to-grad-red text-white shadow-lg"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="mt-auto space-y-3">
        <NotificationBell role={role} />
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center justify-between">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <RoleBadge role={role} />
          </div>
          {user.email ? (
            <p className="mt-0.5 truncate text-xs text-white/50">{user.email}</p>
          ) : null}
          <div className="mt-2 flex items-center justify-between">
            <LiveChip connected={live} />
          </div>
        </div>
        <button
          onClick={logout}
          disabled={loggingOut}
          className="btn-outline py-2! text-sm"
        >
          {loggingOut ? "Logging out..." : "Log Out"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="auth-bg min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col lg:flex-row">
        <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-white/5 backdrop-blur-md lg:block">
          {sidebar}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-white/10 bg-black/10 px-4 py-3 lg:hidden">
            <div className="flex items-center gap-2">
              <HexLogo className="h-8 w-8" />
              <span className="text-sm font-bold">SupportFlow</span>
            </div>
            <div className="flex items-center gap-3">
              <LiveChip connected={live} />
              <NotificationBell role={role} muted />
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="rounded-lg border border-white/20 px-3 py-1.5 text-sm"
                aria-label="Toggle menu"
              >
                Menu
              </button>
            </div>
          </header>

          {menuOpen ? (
            <aside className="border-b border-white/10 bg-white/5 lg:hidden">
              {sidebar}
            </aside>
          ) : null}

          <main className="flex-1 p-4 sm:p-6">
            <Reveal direction="up">{children}</Reveal>
          </main>

          <footer className="border-t border-white/10 px-4 py-3 text-center text-xs text-white/40">
            SupportFlow — AI-Powered Customer Support Desk · Submit. Triage. Resolve.
          </footer>
        </div>
      </div>
      <ChatBot />
    </div>
  );
}