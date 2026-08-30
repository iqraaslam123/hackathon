import Link from "next/link";
import { HexLogo } from "@/components/auth/HexLogo";
import { Reveal } from "@/components/motion/Reveal";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-black/15 backdrop-blur-md">
      <Reveal direction="up">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-2">
          <div className="flex items-center gap-2.5">
            <HexLogo className="h-8 w-8" />
            <span className="text-base font-extrabold tracking-tight">
              SupportFlow
            </span>
          </div>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/60">
            AI-Powered Customer Support Desk. Submit. Triage. Resolve.
            Complaints become numbered tickets, AI suggests a fix path, and
            support agents resolve them in real time.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-bold text-grad-yellow">Explore</h4>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            <li>
              <Link href="/#how" className="transition-colors hover:text-white">
                How it works
              </Link>
            </li>
            <li>
              <Link href="/#features" className="transition-colors hover:text-white">
                Features
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-bold text-grad-yellow">Account</h4>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            <li>
              <Link href="/login" className="transition-colors hover:text-white">
                Login
              </Link>
            </li>
            <li>
              <Link href="/signup" className="transition-colors hover:text-white">
                Sign up
              </Link>
            </li>
            <li>
              <Link href="/dashboard/customer" className="transition-colors hover:text-white">
                Customer dashboard
              </Link>
            </li>
          </ul>
        </div>
      </div>
      </Reveal>
      <div className="border-t border-white/10 py-4">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 text-center text-xs text-white/50 sm:flex-row sm:px-6">
          <span>© {new Date().getFullYear()} SupportFlow — AI-Powered Customer Support Desk</span>
          <span>Submit. Triage. Resolve.</span>
        </div>
      </div>
    </footer>
  );
}