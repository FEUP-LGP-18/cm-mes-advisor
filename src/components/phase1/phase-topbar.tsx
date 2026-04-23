"use client";

import Image from "next/image";
import ThemeToggle from "@/app/theme-toggle";

export default function Phase1Topbar() {
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

      <div className="top-shell-toggle">
        <ThemeToggle />
      </div>
    </nav>
  );
}
