import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./utils";

type FvStatTone = "neutral" | "info" | "success" | "warning" | "error" | "accent";

const statToneClass: Record<FvStatTone, string> = {
  accent: "fv-stat-value-purple",
  error: "fv-stat-value-red",
  info: "fv-stat-value-blue",
  neutral: "",
  success: "fv-stat-value-green",
  warning: "fv-stat-value-orange",
};

export interface FvStatCardProps extends HTMLAttributes<HTMLElement> {
  helper?: ReactNode;
  label: ReactNode;
  progress?: number;
  tone?: FvStatTone;
  value: ReactNode;
}

export function FvStatCard({
  className,
  helper,
  label,
  progress,
  tone = "neutral",
  value,
  ...props
}: FvStatCardProps) {
  const normalizedProgress =
    typeof progress === "number"
      ? Math.max(0, Math.min(100, progress))
      : null;

  return (
    <article className={cx("fv-stat-card", className)} {...props}>
      <div className="fv-stat-label">{label}</div>
      <div className={cx("fv-stat-value", statToneClass[tone])}>{value}</div>
      {helper ? <div className="fv-stat-sub">{helper}</div> : null}
      {normalizedProgress !== null ? (
        <div
          aria-label={`${normalizedProgress}%`}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={normalizedProgress}
          className="fv-stat-bar"
          role="progressbar"
        >
          <div
            className={cx(
              "fv-stat-bar-fill",
              `fv-stat-bar-fill-${tone}`,
            )}
            style={{ width: `${normalizedProgress}%` }}
          />
        </div>
      ) : null}
    </article>
  );
}
