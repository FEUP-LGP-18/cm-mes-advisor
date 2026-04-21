"use client";

import Image from "next/image";
import ThemeToggle from "@/app/theme-toggle";

export default function Phase1Topbar() {
  return (
    <nav aria-label="Product" className="top-shell animate-enter">
      <div className="flex min-w-0 items-center gap-3">
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

        <div className="min-w-0">
          <p className="mono-label truncate text-[0.62rem] text-[color:var(--shell-subtle)]">
            Critical Manufacturing · U.Porto LGP 18
          </p>
          <p className="truncate text-sm font-semibold text-[color:var(--shell-ink)]">
            MES Demo Advisor
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 text-xs font-semibold">
        <div className="brand-endorsement">
          <div className="brand-endorsement-logo">
            <Image
              alt="U.Porto"
              className="theme-logo theme-logo-light h-4 w-auto sm:h-[1.1rem]"
              height={68}
              priority
              src="/brand/uporto-mark-light.svg"
              width={294}
            />
            <Image
              alt="U.Porto"
              className="theme-logo theme-logo-dark h-4 w-auto sm:h-[1.1rem]"
              height={68}
              priority
              src="/brand/uporto-mark-dark.svg"
              width={294}
            />
          </div>
          <span className="mono-label text-[0.5rem] text-[color:var(--shell-subtle)]">
            Academic context
          </span>
        </div>

        <ThemeToggle />

        <span className="shell-chip shell-chip-warn">Phase 1 MVP</span>
        <span className="shell-chip shell-chip-neutral">
          Prototype + grounded modes
        </span>
      </div>
    </nav>
  );
}
