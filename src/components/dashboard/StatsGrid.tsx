import type { StatsDTO } from "./ticketApi";

const CARD_META: { key: keyof StatsDTO; label: string; accent: string }[] = [
  { key: "total", label: "Total", accent: "border-l-grad-orange" },
  { key: "open", label: "New", accent: "border-l-sky-400" },
  { key: "inProgress", label: "In Progress", accent: "border-l-amber-400" },
  { key: "resolved", label: "Resolved", accent: "border-l-emerald-400" },
  { key: "highPriority", label: "High Priority", accent: "border-l-red-400" },
];

export function StatsGrid({ stats }: { stats: StatsDTO | null }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {CARD_META.map((meta) => (
        <div
          key={meta.key}
          className={`rounded-2xl border border-l-4 border-white/10 bg-white/5 p-4 ${meta.accent}`}
        >
          <p className="text-xs uppercase tracking-wider text-white/50">
            {meta.label}
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums">
            {stats ? stats[meta.key] ?? 0 : "—"}
          </p>
        </div>
      ))}
    </div>
  );
}