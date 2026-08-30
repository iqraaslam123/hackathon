import {
  STATUS_COLORS,
  PRIORITY_COLORS,
} from "@/lib/ticketConstants";

export function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status as keyof typeof STATUS_COLORS];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
        cls ?? "border-white/20 bg-white/10 text-white/80"
      }`}
    >
      {status}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const cls = PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
        cls ?? "border-white/20 bg-white/10 text-white/80"
      }`}
    >
      {priority}
    </span>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    customer: "border-sky-300/50 bg-sky-500/15 text-sky-200",
    agent: "border-violet-300/50 bg-violet-500/15 text-violet-200",
    admin: "border-amber-300/50 bg-amber-500/15 text-amber-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${
        colors[role] ?? "border-white/20 bg-white/10 text-white/80"
      }`}
    >
      {role}
    </span>
  );
}

export function LiveChip({ connected }: { connected: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
        connected
          ? "border-emerald-300/50 bg-emerald-500/15 text-emerald-200"
          : "border-white/20 bg-white/10 text-white/60"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          connected ? "bg-emerald-400 animate-pulse" : "bg-white/40"
        }`}
      />
      {connected ? "Live" : "Offline"}
    </span>
  );
}