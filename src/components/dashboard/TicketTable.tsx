import { StatusBadge, PriorityBadge } from "./Badges";
import type { TicketDTO } from "./ticketApi";

function formatDate(value?: string | Date): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function latestMessage(ticket: TicketDTO): string {
  const last = ticket.messages[ticket.messages.length - 1];
  return last ? last.message : "No messages yet";
}

export function TicketTable({
  tickets,
  onSelect,
  emptyMessage = "No tickets found.",
  showCustomer = false,
}: {
  tickets: TicketDTO[];
  onSelect: (ticket: TicketDTO) => void;
  emptyMessage?: string;
  showCustomer?: boolean;
}) {
  if (tickets.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-sm text-white/70">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-white/50">
              <th className="px-4 py-3 font-medium">Ticket</th>
              {showCustomer ? (
                <th className="px-4 py-3 font-medium">Customer</th>
              ) : null}
              <th className="px-4 py-3 font-medium">Subject</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Priority</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">Latest message</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr
                key={t.id}
                onClick={() => onSelect(t)}
                className="cursor-pointer border-b border-white/5 transition-colors hover:bg-white/10"
              >
                <td className="px-4 py-3 font-mono text-xs text-grad-yellow">
                  {t.ticketNumber}
                </td>
                {showCustomer ? (
                  <td className="px-4 py-3 text-white/75">
                    {t.customer?.name ?? "—"}
                  </td>
                ) : null}
                <td className="max-w-[220px] px-4 py-3 truncate font-medium">
                  {t.subject}
                </td>
                <td className="px-4 py-3 text-white/75">{t.category}</td>
                <td className="px-4 py-3">
                  <PriorityBadge priority={t.priority} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={t.status} />
                </td>
                <td className="px-4 py-3 text-white/60">
                  {formatDate(t.createdAt)}
                </td>
                <td className="max-w-[220px] px-4 py-3 truncate text-white/60">
                  {latestMessage(t)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export { formatDate };