import type { AriaRole, HTMLAttributes, ReactNode } from "react";
import { cx } from "./utils";

export type FvCalloutTone = "info" | "status" | "success" | "warning" | "error";

const calloutToneClass: Record<FvCalloutTone, string> = {
  error: "fv-callout-error",
  info: "fv-callout-info",
  status: "fv-callout-status",
  success: "fv-callout-success",
  warning: "fv-callout-warning",
};

export interface FvCalloutProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  icon?: ReactNode;
  live?: "polite" | "assertive" | "off";
  role?: AriaRole;
  title?: ReactNode;
  tone?: FvCalloutTone;
}

export function FvCallout({
  children,
  className,
  icon,
  live,
  role,
  title,
  tone = "info",
  ...props
}: FvCalloutProps) {
  return (
    <div
      aria-live={live}
      className={cx("fv-callout", calloutToneClass[tone], className)}
      role={role ?? (tone === "error" ? "alert" : undefined)}
      {...props}
    >
      {icon ? <span className="fv-callout-icon">{icon}</span> : null}
      <div className="fv-callout-content">
        {title ? <div className="fv-callout-title">{title}</div> : null}
        <div className="fv-callout-body">{children}</div>
      </div>
    </div>
  );
}
