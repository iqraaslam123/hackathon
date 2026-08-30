"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";
import { Input } from "@/components/auth/Input";
import { Button } from "@/components/auth/Button";
import { Alert } from "@/components/auth/Alert";
import { showError, showSuccess } from "@/lib/swal";

function ForgotPassword() {
  const router = useRouter();
  const params = useSearchParams();
  const resetToken = params.get("token") ?? "";

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [sending, setSending] = useState(false);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passErrors, setPassErrors] = useState<{ password?: string; confirm?: string }>({});
  const [passMessage, setPassMessage] = useState("");
  const [resetting, setResetting] = useState(false);

  async function requestReset(e: React.FormEvent) {
    e.preventDefault();
    setEmailMessage("");
    setEmailError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError("Enter a valid email address.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEmailError(data.message || "Something went wrong.");
        await showError("Request failed", data.message || "Something went wrong.");
      } else {
        setEmailMessage(
          "If the account exists, a reset link has been sent. For development, check the server console for the reset URL."
        );
        await showSuccess(
          "Reset link sent",
          "If an account exists for that email, a password reset link has been sent."
        );
      }
    } catch {
      setEmailError("Something went wrong. Please try again.");
      await showError("Something went wrong", "Please try again.");
    } finally {
      setSending(false);
    }
  }

  async function doReset(e: React.FormEvent) {
    e.preventDefault();
    setPassMessage("");
    const next: typeof passErrors = {};
    if (!password || password.length < 8)
      next.password = "Password must be at least 8 characters.";
    if (confirm !== password) next.confirm = "Passwords do not match.";
    setPassErrors(next);
    if (Object.keys(next).length) return;

    setResetting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPassErrors({ password: data.message || "Reset failed." });
        await showError("Reset failed", data.message || "Please try again.");
        return;
      }
      setPassMessage("Password reset successfully. Redirecting...");
      await showSuccess("Password reset", "Your password has been updated. You are now logged in.");
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1200);
    } catch {
      setPassErrors({ password: "Something went wrong. Please try again." });
      await showError("Something went wrong", "Please try again.");
    } finally {
      setResetting(false);
    }
  }

  const mode = resetToken ? "reset" : "request";

  return (
    <AuthLayout
      title={mode === "reset" ? "Set New Password" : "Forgot Password"}
      subtitle={
        mode === "reset"
          ? "Choose a new password for your account"
          : "We'll email you a secure reset link"
      }
    >
      <AuthCard>
        {mode === "request" ? (
          <form onSubmit={requestReset} className="space-y-4 fade-up" noValidate>
            {emailMessage ? (
              <div className="mb-2">
                <Alert type="success">{emailMessage}</Alert>
              </div>
            ) : null}
            <Input
              label="Email"
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={emailError}
            />
            <Button type="submit" loading={sending}>
              Send Reset Link
            </Button>
            <p className="text-center text-sm text-white/70">
              Remembered it?{" "}
              <Link href="/login" className="form-link">
                Back to login
              </Link>
            </p>
          </form>
        ) : (
          <form onSubmit={doReset} className="space-y-4 fade-up" noValidate>
            {passMessage ? (
              <div className="mb-2">
                <Alert type="success">{passMessage}</Alert>
              </div>
            ) : null}
            <Input
              label="New Password"
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="Min 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={passErrors.password}
            />
            <Input
              label="Confirm New Password"
              id="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="Repeat password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              error={passErrors.confirm}
            />
            <Button type="submit" loading={resetting}>
              Reset Password
            </Button>
          </form>
        )}
      </AuthCard>
    </AuthLayout>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPassword />
    </Suspense>
  );
}
