"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";
import { Input } from "@/components/auth/Input";
import { Button } from "@/components/auth/Button";
import { Divider, GoogleButton } from "@/components/auth/Providers";
import { RoleSelector } from "@/components/auth/RoleSelector";
import { showError, showSuccess } from "@/lib/swal";

type FormState = {
  name: string;
  username: string;
  email: string;
  password: string;
  confirm: string;
};

type FormStateKeys = keyof FormState;

type FieldErrors = Partial<Record<FormStateKeys | "role", string>>;

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    name: "",
    username: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [role, setRole] = useState("customer");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validate(): boolean {
    const next: FieldErrors = {};
    if (!form.name.trim()) next.name = "Full name is required.";
    if (!form.username.trim()) next.username = "Username is required.";
    else if (!/^[a-zA-Z0-9_]{3,20}$/.test(form.username.trim()))
      next.username = "3-20 chars, letters, numbers, underscores only.";
    if (!form.email.trim()) next.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      next.email = "Enter a valid email address.";
    if (!form.password) next.password = "Password is required.";
    else if (form.password.length < 8)
      next.password = "Password must be at least 8 characters.";
    if (form.confirm !== form.password)
      next.confirm = "Passwords do not match.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const isReady = validate();
    if (!isReady) {
      await showError(
        "Please check your details",
        "One or more fields need attention. Fix the highlighted fields and try again."
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          username: form.username,
          email: form.email,
          password: form.password,
          role,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        await showError("Signup failed", data.message || "Please check your details.");
        return;
      }
      await showSuccess("Account created!", `Welcome, ${data.user?.name ?? ""}. Please verify your email to continue.`);
      router.push(`/verify-email?email=${encodeURIComponent(data.user?.email ?? "")}`);
      router.refresh();
    } catch (err) {
      console.error("Signup error:", err);
      await showError("Something went wrong", "Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Join us and get started in minutes"
    >
      <AuthCard>

        <form onSubmit={handleSubmit} className="space-y-4 fade-up" noValidate>
          <Input
            label="Full Name"
            id="name"
            type="text"
            autoComplete="name"
            placeholder="Jane Doe"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            error={errors.name}
          />
          <Input
            label="Username"
            id="username"
            type="text"
            autoComplete="username"
            placeholder="janedoe"
            value={form.username}
            onChange={(e) => set("username", e.target.value)}
            error={errors.username}
          />
          <Input
            label="Email"
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            error={errors.email}
          />
          <Input
            label="Password"
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="Min 8 characters"
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            error={errors.password}
          />
          <Input
            label="Confirm Password"
            id="confirm"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat password"
            value={form.confirm}
            onChange={(e) => set("confirm", e.target.value)}
            error={errors.confirm}
          />
          <RoleSelector value={role} onChange={setRole} />
          <Button type="submit" loading={loading}>
            Create Account
          </Button>
        </form>

        <Divider text="or sign up with" />

        <div className="space-y-3">
          <GoogleButton />
        </div>

        <p className="mt-6 text-center text-sm text-white/70">
          Already have an account?{" "}
          <Link href="/login" className="form-link">
            Log in
          </Link>
        </p>
      </AuthCard>
    </AuthLayout>
  );
}
