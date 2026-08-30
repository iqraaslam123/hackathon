"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/auth/Button";
import { OtpInput } from "@/components/auth/OtpInput";
import { showSuccess } from "@/lib/swal";

function VerifyEmailForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [sending, setSending] = useState(false);

  async function requestCode() {
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/auth/send-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(email ? { email } : {}),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Could not send the code. Try again.");
        return;
      }
      setDevOtp(data.devOtp ?? "");
      setError("");
      startResendTimer();
      await showSuccess("Code sent", "A 6-digit verification code has been sent to your inbox.");
    } catch {
      setError("Could not send the code. Try again.");
    } finally {
      setSending(false);
    }
  }

  function startResendTimer() {
    setResendIn(30);
  }

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  async function handleVerify() {
    setError("");
    if (otp.length !== 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setVerifying(true);
    try {
      const res = await fetch("/api/auth/verify-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Verification failed. Try again.");
        return;
      }
      await showSuccess("Email verified!", "Your email has been verified successfully.");
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Verification failed. Try again.");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <AuthLayout
      title="Verify Your Email"
      subtitle="Enter the 6-digit code we sent to your inbox"
    >
      <AuthCard>
        {email ? (
          <p className="mb-4 text-center text-sm text-white/70">
            Code sent to <span className="font-semibold text-white">{email}</span>
          </p>
        ) : null}

        {devOtp ? (
          <div className="mb-4 rounded-xl border border-amber-300/40 bg-amber-500/10 p-3 text-center text-sm">
            <span className="text-amber-200">
              Development code: <span className="font-mono font-bold">{devOtp}</span>
            </span>
          </div>
        ) : null}

        <div className="space-y-5">
          <OtpInput value={otp} onChange={setOtp} disabled={verifying} />

          {error ? (
            <p className="text-center text-xs text-red-200">{error}</p>
          ) : null}

          <Button onClick={handleVerify} loading={verifying} className="w-full">
            Verify Email
          </Button>

          <div className="text-center text-sm text-white/70">
            {resendIn > 0 ? (
              <span>
                Resend code in <span className="font-semibold text-white">{resendIn}s</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={requestCode}
                disabled={sending}
                className="form-link"
              >
                {sending ? "Sending..." : "Resend code"}
              </button>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-white/70">
          Already verified?{" "}
          <Link href="/dashboard" className="form-link">
            Go to dashboard
          </Link>
        </p>
      </AuthCard>
    </AuthLayout>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailForm />
    </Suspense>
  );
}
