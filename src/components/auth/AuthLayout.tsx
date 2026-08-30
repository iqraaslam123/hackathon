import Link from "next/link";
import { HexLogo } from "./HexLogo";
import { Waves } from "./Waves";
import { ChatBot } from "@/components/chat/ChatBot";
import { Reveal } from "@/components/motion/Reveal";

export function AuthLayout({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="auth-bg flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Waves />
      <Link
        href="/"
        className="absolute left-4 top-4 z-20 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/30 px-3 py-1.5 text-xs font-medium text-white/70 backdrop-blur-md transition-colors hover:border-white/40 hover:text-white"
      >
        ← Back to home
      </Link>

      <Reveal direction="zoom" className="relative z-10 w-full max-w-md">
        <div className="card-in">
          <div className="mb-6 flex flex-col items-center text-center">
            <HexLogo />
            <h1 className="mt-4 text-2xl font-bold tracking-tight">{title}</h1>
            {subtitle ? (
              <p className="mt-1 text-sm text-white/70">{subtitle}</p>
            ) : null}
          </div>
          {children}
        </div>
      </Reveal>

      <footer className="absolute bottom-3 left-0 right-0 z-10 text-center text-xs text-white/40">
        SupportFlow — AI-Powered Customer Support Desk
      </footer>

      <ChatBot />
    </div>
  );
}
