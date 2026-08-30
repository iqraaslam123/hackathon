import Link from "next/link";
import { HexLogo } from "@/components/auth/HexLogo";

const NAV_LINKS = [
  { label: "How it works", href: "/#how" },
  { label: "Features", href: "/#features" },
];

export function SiteNavbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-black/10 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <HexLogo className="h-10 w-10" />
          <span className="text-lg font-extrabold tracking-tight">
            SupportFlow
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-white/70 sm:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="transition-colors hover:text-white"
            >
              {l.label}
            </Link>
          ))}
          <Link href="/login" className="form-link">
            Login
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="btn-outline w-auto! px-4! py-2! text-sm sm:hidden"
          >
            Login
          </Link>
          <Link href="/signup" className="btn-primary w-auto! px-5! py-2! text-sm">
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}