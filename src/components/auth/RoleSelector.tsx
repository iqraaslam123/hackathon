"use client";

export const ROLE_OPTIONS = [
  { value: "customer", label: "Customer", demoEmail: "demo@supportflow.app" },
  { value: "agent", label: "Agent", demoEmail: "agent@supportflow.app" },
  { value: "admin", label: "Admin", demoEmail: "admin@supportflow.app" },
] as const;

export const DEMO_PASSWORD = "SupportFlow@123";

export function RoleSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (role: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-white/80">
        Sign up as
      </label>
      <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-white/10 bg-black/20 p-1.5">
        {ROLE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-xl px-2 py-2 text-xs font-semibold transition-colors ${
              value === opt.value
                ? "bg-gradient-to-r from-grad-orange to-grad-red text-white shadow-lg"
                : "text-white/60 hover:bg-white/10 hover:text-white"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <p className="text-[11px] leading-relaxed text-white/45">
        Demo accounts (created by <code className="text-white/70">/api/dev/seed</code>{" "}
        use password <code className="text-white/70">{DEMO_PASSWORD}</code>) and are
        only honored during development.
      </p>
    </div>
  );
}