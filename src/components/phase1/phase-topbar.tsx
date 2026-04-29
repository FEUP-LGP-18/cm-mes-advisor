"use client";

import Image from "next/image";
import ThemeToggle from "@/app/theme-toggle";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function Phase1Topbar() {
  async function handleSignOut() {
    if (!isSupabaseConfigured()) {
      window.location.assign("/");
      return;
    }

    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.assign("/login");
  }

  return (
    <nav aria-label="Product" className="top-shell animate-enter">
      <div className="top-shell-brand">
        <div className="brand-lockup">
          <Image
            alt="Critical Manufacturing"
            className="theme-logo theme-logo-light h-7 w-auto sm:h-8"
            height={44}
            priority
            src="/brand/critical-manufacturing.svg"
            width={178}
          />
          <Image
            alt="Critical Manufacturing"
            className="theme-logo theme-logo-dark h-7 w-auto sm:h-8"
            height={44}
            priority
            src="/brand/critical-manufacturing-white.svg"
            width={178}
          />
        </div>

        <div className="top-shell-copy">
          <p className="mono-label top-shell-product-label">
            Critical Manufacturing
          </p>
          <p className="top-shell-product-title">MES Demo Advisor</p>
        </div>
      </div>

      <div className="top-shell-partner">
        <span className="mono-label top-shell-partner-label">
          In collaboration with
        </span>
        <div className="uporto-lockup" aria-label="University of Porto">
          <Image
            alt="University of Porto"
            className="theme-logo theme-logo-light uporto-logo"
            height={118}
            src="/brand/uporto-header-light.png"
            width={533}
          />
          <Image
            alt="University of Porto"
            className="theme-logo theme-logo-dark uporto-logo"
            height={118}
            src="/brand/uporto-header-dark.png"
            width={533}
          />
        </div>
      </div>

      <div className="top-shell-toggle" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <button
          type="button"
          onClick={handleSignOut}
          className="focus-premium theme-shell-button-secondary rounded-xl px-3 py-2 text-xs font-semibold transition"
          aria-label="Sign out"
        >
          Sign out
        </button>
        <ThemeToggle />
      </div>
    </nav>
  );
}
