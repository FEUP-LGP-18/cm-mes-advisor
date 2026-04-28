"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AuthShell from "@/components/auth/auth-shell";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.updateUser({ password });

    if (authError) {
      setError("Could not update the password. The reset link may have expired — request a new one.");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <AuthShell>
      <div className="w-full max-w-sm animate-enter">
        <div className="premium-panel rounded-3xl p-8 grid gap-6">
          <div className="grid gap-1">
            <h1 className="text-2xl font-semibold tracking-tight text-[color:var(--shell-ink)]">
              Set new password
            </h1>
            <p className="text-sm text-[color:var(--shell-muted)]">
              Choose a strong password for your account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
            <div className="grid gap-1.5">
              <label
                htmlFor="password"
                className="mono-label text-[0.68rem] text-[color:var(--shell-subtle)]"
              >
                New password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                placeholder="At least 6 characters"
                className="focus-premium theme-shell-input w-full rounded-2xl px-4 py-3 text-sm"
              />
            </div>

            <div className="grid gap-1.5">
              <label
                htmlFor="confirm"
                className="mono-label text-[0.68rem] text-[color:var(--shell-subtle)]"
              >
                Confirm password
              </label>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.currentTarget.value)}
                placeholder="Repeat your password"
                className="focus-premium theme-shell-input w-full rounded-2xl px-4 py-3 text-sm"
              />
            </div>

            {error ? (
              <div
                role="alert"
                className="phase-feedback phase-feedback-error rounded-2xl text-sm"
              >
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="focus-premium theme-button-primary w-full rounded-2xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Updating…" : "Update password"}
            </button>
          </form>
        </div>
      </div>
    </AuthShell>
  );
}
