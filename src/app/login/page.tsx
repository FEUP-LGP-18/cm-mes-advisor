"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  AUTH_NOT_CONFIGURED_MESSAGE,
  getAuthRedirectErrorMessage,
  mapSignInError,
  sanitizeAuthNextPath,
} from "@/lib/supabase/auth-messages";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import AuthShell from "@/components/auth/auth-shell";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = sanitizeAuthNextPath(searchParams.get("next"));
  const supabaseConfigured = isSupabaseConfigured();
  const setupMessage = supabaseConfigured
    ? getAuthRedirectErrorMessage(searchParams.get("error"))
    : AUTH_NOT_CONFIGURED_MESSAGE;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!supabaseConfigured) {
      setError(AUTH_NOT_CONFIGURED_MESSAGE);
      return;
    }

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
      <div className="fv-auth-card">
        {/* Brand */}
        <div className="fv-auth-logo-wrap">
          <div className="fv-auth-logo-icon">
            <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect x="3" y="3" width="14" height="4" rx="1" fill="currentColor" opacity="0.9" />
              <rect x="3" y="9" width="14" height="4" rx="1" fill="currentColor" opacity="0.7" />
              <rect x="3" y="15" width="14" height="2" rx="1" fill="currentColor" opacity="0.5" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0f172a", letterSpacing: "-0.02em" }}>
              MES Advisor
            </div>
            <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>Critical Manufacturing</div>
          </div>
        </div>

        {/* Heading */}
        <h1 className="fv-auth-heading">Sign in to continue</h1>
        <p className="fv-auth-sub">Access your MES configuration workspace</p>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem" }} noValidate>
          <div>
            <label htmlFor="email" className="fv-auth-field-label">Email address</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              placeholder="consultant@criticalmanufacturing.com"
              className="fv-auth-input"
            />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.375rem" }}>
              <label htmlFor="password" className="fv-auth-field-label" style={{ marginBottom: 0 }}>Password</label>
              <Link href="/forgot-password" className="fv-auth-forgot">Forgot password?</Link>
            </div>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              placeholder="Enter your password"
              className="fv-auth-input"
            />
          </div>

          {setupMessage ? (
            <div role="alert" style={{ fontSize: "0.8rem", color: "#991b1b", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", padding: "0.625rem 0.75rem" }}>
              {setupMessage}
            </div>
          ) : null}

          {error ? (
            <div role="alert" style={{ fontSize: "0.8rem", color: "#991b1b", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", padding: "0.625rem 0.75rem" }}>
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading || !supabaseConfigured}
            className="fv-auth-submit"
            style={{ marginTop: "0.25rem" }}
          >
            {loading ? "Signing in…" : "Sign In →"}
          </button>
        </form>

        {!supabaseConfigured ? (
          <div style={{ marginTop: "1rem" }}>
            <Link
              href="/"
              className="fv-auth-submit"
              style={{ display: "flex", textDecoration: "none" }}
            >
              Continue in mock mode
            </Link>
          </div>
        ) : (
          <p className="fv-auth-footer" style={{ marginTop: "1rem" }}>
            No account?{" "}
            <Link
              href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}
              style={{ color: "var(--brand-primary)", fontWeight: 600 }}
            >
              Sign up
            </Link>
          </p>
        )}

        <p className="fv-auth-footer" style={{ marginTop: "1rem" }}>Protected by Critical Manufacturing</p>
      </div>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
