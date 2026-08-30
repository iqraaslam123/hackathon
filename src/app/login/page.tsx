"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";
import { Input } from "@/components/auth/Input";
import { Button } from "@/components/auth/Button";
import { Alert } from "@/components/auth/Alert";
import { Divider, GoogleButton } from "@/components/auth/Providers";
import { ROLE_OPTIONS, DEMO_PASSWORD } from "@/components/auth/RoleSelector";
import { showError, showSuccess } from "@/lib/swal";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const error = params.get("error");

  const [form, setForm] = useState<{ identifier: string; password: string }>({
    identifier: ROLE_OPTIONS[0].demoEmail,
    password: DEMO_PASSWORD,
  });
  const [role, setRole] = useState("customer");
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  function selectRole(value: string) {
    setRole(value);
    const meta = ROLE_OPTIONS.find((o) => o.value === value);
    if (meta) {
      setForm({
        identifier: meta.demoEmail,
        password: DEMO_PASSWORD,
      });
    }
  }

  async function setupDemo() {
    setSeeding(true);
    try {
      const res = await fetch("/api/dev/seed", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not set up demo accounts.");
      if (role !== "customer") selectRole(role);
      await showSuccess(
        "Demo accounts ready",
        `Created: ${(data.created ?? []).length} · Password: ${data.password}. ${role !== "customer" && data.created && data.created.length === 0 ? "Account email/role reset to match the demo." : "Now press Log In."}`
      );
    } catch (err) {
      await showError("Setup failed", (err as Error).message);
    } finally {
      setSeeding(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const nextErrors: typeof errors = {};
    if (!form.identifier.trim()) nextErrors.identifier = "Email or username is required.";
    if (!form.password) nextErrors.password = "Password is required.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        await showError("Login failed", data.message || "Please check your credentials.");
        return;
      }
      await showSuccess("Welcome back!", `You are now logged in as ${data.user?.name ?? ""}`);
      router.push("/dashboard");
      router.refresh();
    } catch {
      await showError("Something went wrong", "Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const googleError =
    error === "google_not_configured"
      ? "Google sign-in is not configured on this server."
      : error === "google_auth_failed"
      ? "Google sign-in failed. Please try again."
      : error
      ? "Something went wrong. Please try again."
      : "";

  return (
    <AuthCard>
      {googleError ? <div className="mb-4"><Alert type="error">{googleError}</Alert></div> : null}

      <div className="space-y-1.5 mb-4">
        <label className="block text-sm font-medium text-white/80">Login as</label>
        <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-white/10 bg-black/20 p-1.5">
          {ROLE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => selectRole(opt.value)}
              className={`rounded-xl px-2 py-2 text-xs font-semibold transition-colors ${
                role === opt.value
                  ? "bg-gradient-to-r from-grad-orange to-grad-red text-white shadow-lg"
                  : "text-white/60 hover:bg-white/10 hover:text-white"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] leading-relaxed text-white/45">
          Demo accounts are pre-filled (password{" "}
          <code className="text-white/70">{DEMO_PASSWORD}</code>). If login says
          invalid credentials, first run the seed below.
        </p>
        <button
          type="button"
          onClick={setupDemo}
          disabled={seeding}
          className="btn-outline w-auto! px-4! py-1.5! text-xs"
        >
          {seeding ? "Setting up..." : "Setup demo accounts"}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 fade-up" noValidate>
        <Input
          label="Email / Username"
          id="identifier"
          type="text"
          autoComplete="username"
          placeholder="you@example.com"
          value={form.identifier}
          onChange={(e) => setForm({ ...form, identifier: e.target.value })}
          error={errors.identifier}
        />
        <Input
          label="Password"
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          error={errors.password}
        />
        <div className="flex justify-end">
          <Link href="/forgot-password" className="form-link text-sm">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" loading={loading}>
          Log In
        </Button>
      </form>

      <Divider text="or continue with" />

      <div className="space-y-3">
        <GoogleButton />
      </div>

      <p className="mt-6 text-center text-sm text-white/70">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="form-link">
          Sign up
        </Link>
      </p>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <AuthLayout title="Welcome Back" subtitle="Log in to your account">
        <LoginForm />
      </AuthLayout>
    </Suspense>
  );
}
