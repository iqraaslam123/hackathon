"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { HexLogo } from "@/components/auth/HexLogo";
import { Input } from "@/components/auth/Input";
import { confirmAction, showSuccess } from "@/lib/swal";

type Profile = {
  name: string;
  username?: string | null;
  email?: string | null;
  provider?: string;
  verified?: boolean;
};

export function DashboardClient({
  user,
  userVerified,
}: {
  user: {
    name: string;
    username?: string | null;
    email?: string | null;
    provider?: string;
  };
  userVerified?: boolean;
}) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: user.name ?? "",
    username: user.username ?? "",
    email: user.email ?? "",
    currentPassword: "",
    newPassword: "",
  });
  const [verified, setVerified] = useState(!!userVerified);

  async function logout() {
    const confirmed = await confirmAction(
      "Log out?",
      "Are you sure you want to sign out of your account?",
      "Yes, log out"
    );
    if (!confirmed) return;

    setLoggingOut(true);
    setError("");
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      await showSuccess("Logged out", `Goodbye, ${user.name}. See you soon!`);
      router.push("/login");
      router.refresh();
    } catch {
      setError("Failed to log out. Please try again.");
      setLoggingOut(false);
    }
  }

  async function saveProfile() {
    setSaving(true);
    setError("");
    try {
      const payload: Record<string, string> = {
        name: form.name,
      };
      if (form.username) payload.username = form.username;
      if (form.email) payload.email = form.email;
      if (form.newPassword) {
        payload.currentPassword = form.currentPassword;
        payload.newPassword = form.newPassword;
      }

      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Could not update your profile.");
        return;
      }

      const updated: Profile = data.user ?? {};
      setVerified(!!updated.verified);
      setForm((f) => ({
        ...f,
        name: updated.name ?? f.name,
        username: updated.username ?? f.username,
        email: updated.email ?? f.email,
        currentPassword: "",
        newPassword: "",
      }));

      if (data.needsEmailVerification) {
        setEditing(false);
        await showSuccess(
          "Email changed",
          "Your email was updated and now needs verification. Please verify it to continue."
        );
        router.push(`/verify-email?email=${encodeURIComponent(updated.email ?? "")}`);
        router.refresh();
        return;
      }

      setEditing(false);
      if (payload.newPassword) {
        await showSuccess("Profile updated", "Your details and password were changed.");
      } else {
        await showSuccess("Profile updated", "Your details were saved.");
      }
      router.refresh();
    } catch {
      setError("Could not update your profile. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="auth-bg flex min-h-screen items-center justify-center px-4 py-10">
      <div className="relative z-10 w-full max-w-lg card-in">
        <div className="flex flex-col items-center text-center">
          <HexLogo />
          <h1 className="mt-4 text-3xl font-bold tracking-tight">
            Welcome, {user.name}
          </h1>
          <p className="mt-1 text-white/70">
            You are signed in to your dashboard.
            {!verified ? (
              <span className="ml-2 inline-block rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-200">
                unverified
              </span>
            ) : (
              <span className="ml-2 inline-block rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-200">
                verified
              </span>
            )}
          </p>
        </div>

        <div className="mt-8 rounded-3xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-md">
          {!editing ? (
            <>
              <h2 className="mb-4 text-lg font-semibold">Account details</h2>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <dt className="text-white/60">Name</dt>
                  <dd className="font-medium">{user.name}</dd>
                </div>
                {user.username ? (
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <dt className="text-white/60">Username</dt>
                    <dd className="font-medium">@{user.username}</dd>
                  </div>
                ) : null}
                {user.email ? (
                  <div className="flex justify-between border-b border-white/10 pb-2">
                    <dt className="text-white/60">Email</dt>
                    <dd className="font-medium">{user.email}</dd>
                  </div>
                ) : null}
                {user.provider ? (
                  <div className="flex justify-between">
                    <dt className="text-white/60">Provider</dt>
                    <dd className="font-medium capitalize">{user.provider}</dd>
                  </div>
                ) : null}
              </dl>

              {error ? (
                <div className="mt-4">
                  <p className="alert-error">{error}</p>
                </div>
              ) : null}

              <button
                onClick={() => setEditing(true)}
                className="btn-outline mt-6"
              >
                Edit Profile
              </button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Edit Profile</h2>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setError("");
                    setForm({
                      name: user.name ?? "",
                      username: user.username ?? "",
                      email: user.email ?? "",
                      currentPassword: "",
                      newPassword: "",
                    });
                  }}
                  className="form-link text-sm"
                >
                  Cancel
                </button>
              </div>

              <Input
                label="Full Name"
                id="edit-name"
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Your name"
              />
              <Input
                label="Username"
                id="edit-username"
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="yourusername"
              />
              <Input
                label="Email"
                id="edit-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
              />

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="mb-3 text-sm font-medium text-white/85">
                  Change password (optional)
                </p>
                <div className="space-y-3">
                  <Input
                    label="Current password"
                    id="edit-current"
                    type="password"
                    autoComplete="current-password"
                    value={form.currentPassword}
                    onChange={(e) =>
                      setForm({ ...form, currentPassword: e.target.value })
                    }
                    placeholder="Current password"
                  />
                  <Input
                    label="New password"
                    id="edit-new"
                    type="password"
                    autoComplete="new-password"
                    value={form.newPassword}
                    onChange={(e) =>
                      setForm({ ...form, newPassword: e.target.value })
                    }
                    placeholder="Min 8 characters"
                  />
                </div>
              </div>

              {error ? (
                <p className="alert-error">{error}</p>
              ) : null}

              <div className="flex gap-3">
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="btn-primary flex-1"
                >
                  {saving ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <span className="spinner" /> Saving...
                    </span>
                  ) : (
                    "Save Changes"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  disabled={saving}
                  className="btn-outline"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {!editing ? (
          <>
            <button
              onClick={logout}
              disabled={loggingOut}
              className="btn-primary mt-6 w-full"
            >
              {loggingOut ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <span className="spinner" /> Logging out...
                </span>
              ) : (
                "Log Out"
              )}
            </button>

            <p className="mt-6 text-center text-sm text-white/60">
              Not you?{" "}
              <Link href="/login" className="form-link">
                Switch account
              </Link>
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
