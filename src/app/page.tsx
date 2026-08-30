import Link from "next/link";
import { ChatBot } from "@/components/chat/ChatBot";
import { SiteNavbar } from "@/components/nav/SiteNavbar";
import { SiteFooter } from "@/components/nav/SiteFooter";
import { Reveal } from "@/components/motion/Reveal";
import { Typewriter } from "@/components/motion/Typewriter";
import { Waves } from "@/components/auth/Waves";

const FEATURES = [
  {
    title: "AI Ticket Triage",
    description:
      "Every new ticket is analyzed by AI which suggests a category, priority and one-line summary — ready for your team to review and approve.",
    icon: "🧠",
  },
  {
    title: "Smart Ticket Management",
    description:
      "Numbered tickets move through New → Assigned → In Progress → Resolved with full conversation history and resolution notes.",
    icon: "🗂️",
  },
  {
    title: "Real-Time Communication",
    description:
      "Customers and agents chat inside each ticket. New messages and status changes appear instantly, no refresh needed.",
    icon: "⚡",
  },
  {
    title: "Support Analytics",
    description:
      "Live dashboards surface open, in-progress, resolved and high-priority tickets computed from real ticket data.",
    icon: "📊",
  },
];

const ROLES = [
  {
    role: "Customer",
    desc: "Submit tickets, chat with agents, and track every status change live.",
    cta: "Sign up as a customer",
    href: "/signup",
  },
  {
    role: "Agent",
    desc: "Work from a queue, review AI triage, reply and resolve with one click.",
    cta: "Log in as an agent",
    href: "/login",
  },
  {
    role: "Admin",
    desc: "See every team, ticket and metric in a single overview dashboard.",
    cta: "Log in as admin",
    href: "/login",
  },
];

const STEPS = [
  {
    step: "1",
    title: "Submit",
    desc: "Customer describes the problem and it becomes a numbered ticket in seconds.",
  },
  {
    step: "2",
    title: "AI Triage",
    desc: "AI suggests a category, priority and summary — agents review and approve it.",
  },
  {
    step: "3",
    title: "Resolve",
    desc: "A real-time conversation wraps up the fix, closed with a resolution note.",
  },
];

export default function LandingPage() {
  return (
    <div className="auth-bg flex min-h-screen flex-col">
      <Waves />
      <SiteNavbar />

      <main className="flex-1">
        <Reveal direction="up">
          <section className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-4 pb-16 pt-24 text-center sm:px-6 sm:pt-32">
          <span className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-grad-yellow">
            AI-Powered Support Desk
          </span>
          <h1 className="mt-6 text-5xl font-black tracking-tight sm:text-7xl lg:text-8xl">
            SupportFlow
          </h1>
          <h2 className="mt-4 text-2xl font-bold text-white/90 sm:text-3xl">
            <Typewriter phrases={["AI-Powered Customer Support Desk"]} loop={false} />
          </h2>
          <p className="mt-5 text-lg font-medium text-grad-yellow sm:text-xl">
            &ldquo;Submit. Triage. Resolve.&rdquo;
          </p>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/65 sm:text-base">
            Customers submit tickets, AI triages them instantly, agents review the
            suggestions, and conversations resolve in real time — all in one desk.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/signup" className="btn-primary w-auto! px-10! py-3!">
              Get Started
            </Link>
            <Link href="/login" className="btn-outline w-auto! px-10! py-3!">
              Login
            </Link>
          </div>
          </section>
        </Reveal>

        <section id="how" className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <Reveal direction="up">
            <div className="mb-10 text-center">
              <h2 className="text-2xl font-bold sm:text-3xl">
                How SupportFlow works
              </h2>
              <p className="mt-2 text-sm text-white/60">
                Three steps from customer question to a resolved, documented ticket.
              </p>
            </div>
          </Reveal>
          <div className="grid gap-5 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.step} direction="up" delay={i * 120} className="h-full">
                <div className="flex h-full flex-col rounded-3xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-md">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-grad-orange to-grad-red text-sm font-bold">
                    {s.step}
                  </div>
                  <h3 className="mt-4 text-base font-bold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">
                    {s.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <Reveal direction="up">
            <div className="mb-10 text-center">
              <h2 className="text-2xl font-bold sm:text-3xl">
                Built for support teams that move fast
              </h2>
              <p className="mt-2 text-sm text-white/60">
                Everything you need to go from customer noise to a resolved ticket.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature, i) => (
              <Reveal key={feature.title} direction="up" delay={i * 100} className="h-full">
                <div className="flex h-full flex-col rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md transition-colors hover:border-white/20 hover:bg-white/10">
                  <div className="text-3xl">{feature.icon}</div>
                  <h3 className="mt-4 text-base font-bold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">
                    {feature.description}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-3">
            {ROLES.map((r, i) => (
              <Reveal key={r.role} direction="up" delay={i * 120} className="h-full">
                <div className="flex h-full flex-col rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md transition-colors hover:border-white/20 hover:bg-white/10">
                  <h3 className="text-base font-bold">{r.role}</h3>
                  <p className="mt-2 min-h-[3.5rem] text-sm leading-relaxed text-white/60">
                    {r.desc}
                  </p>
                  <Link href={r.href} className="btn-outline mt-auto! px-4! py-2! text-xs">
                    {r.cta}
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal direction="zoom" className="mt-14">
            <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-maroon-800 to-maroon-700 p-8 text-center sm:p-12">
              <h2 className="text-2xl font-bold sm:text-3xl">
                Ready to resolve faster?
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-white/65">
                Create a free customer account or log in to access your role-based
                support dashboard.
              </p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="/signup" className="btn-primary w-auto! px-8! py-3!">
                  Get Started
                </Link>
                <Link href="/login" className="btn-outline w-auto! px-8! py-3!">
                  Login
                </Link>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <SiteFooter />

      <ChatBot />
    </div>
  );
}