"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AuthShell from "@/components/auth/auth-shell";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/projects";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(mapSignInError(authError.message));
      setLoading(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <AuthShell>
      <div className="w-full max-w-sm animate-enter">
        <div className="premium-panel rounded-3xl p-8 grid gap-6">
          <div className="grid gap-1">
            <h1 className="text-2xl font-semibold tracking-tight text-[color:var(--shell-ink)]">
              Sign in
            </h1>
            <p className="text-sm text-[color:var(--shell-muted)]">
              Pick up where you left off.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
            <div className="grid gap-1.5">
              <label
                htmlFor="email"
                className="mono-label text-[0.68rem] text-[color:var(--shell-subtle)]"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                placeholder="you@example.com"
                className="focus-premium theme-shell-input w-full rounded-2xl px-4 py-3 text-sm"
              />
            </div>

            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="mono-label text-[0.68rem] text-[color:var(--shell-subtle)]"
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-[color:var(--shell-muted)] hover:text-[color:var(--shell-ink)] transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                placeholder="••••••••"
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
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="text-center text-sm text-[color:var(--shell-muted)]">
            No account?{" "}
            <Link
              href="/signup"
              className="font-semibold text-[color:var(--shell-ink)] hover:text-[color:var(--brand-accent-soft)] transition-colors"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </AuthShell>
  );
}

function mapSignInError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials") || lower.includes("invalid email or password")) {
    return "Invalid email or password. Please try again.";
  }
  if (lower.includes("email not confirmed")) {
    return "Check your email and confirm your account before signing in.";
  }
  if (lower.includes("too many requests")) {
    return "Too many sign-in attempts. Wait a moment and try again.";
  }
  return "Sign-in failed. Please check your details and try again.";
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
