"use client";

import Image from "next/image";
import Link from "next/link";
import ThemeToggle from "@/app/theme-toggle";

export default function AuthShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="app-canvas min-h-screen flex flex-col">
      <div className="mx-auto w-full max-w-[1560px] px-4 py-4 sm:px-6 lg:px-8">
        <div className="top-shell animate-enter">
          <div className="top-shell-brand">
            <div className="brand-lockup">
              <Link href="/login" aria-label="CM MES Demo Advisor">
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
              </Link>
            </div>
            <div className="top-shell-copy">
              <p className="mono-label top-shell-product-label">
                Critical Manufacturing
              </p>
              <p className="top-shell-product-title">MES Demo Advisor</p>
            </div>
          </div>

          <div className="top-shell-toggle">
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        {children}
      </div>
    </main>
  );
}
