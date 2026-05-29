import type { HTMLAttributes } from "react";
import { cx } from "./utils";

export type FvBadgeTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "error"
  | "accent";

const badgeToneClass: Record<FvBadgeTone, string> = {
  accent: "fv-badge-pending",
  error: "fv-badge-error",
  info: "fv-badge-ai",
  neutral: "fv-badge-gray",
  success: "fv-badge-approved",
  warning: "fv-badge-flagged",
};

export interface FvBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  compact?: boolean;
  dot?: boolean;
  tone?: FvBadgeTone;
}

export function FvBadge({
  children,
  className,
  compact = false,
  dot = false,
  tone = "neutral",
  ...props
}: FvBadgeProps) {
  return (
    <span
      className={cx(
        "fv-badge",
        badgeToneClass[tone],
        compact && "fv-badge-compact",
        className,
      )}
      {...props}
    >
      {dot ? <span aria-hidden="true" className="fv-badge-dot" /> : null}
      {children}
    </span>
  );
}
