import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./utils";

export type FvProgressStepStatus = "complete" | "active" | "pending" | "error";

export interface FvProgressStep {
  description?: ReactNode;
  label: ReactNode;
  meta?: ReactNode;
  status: FvProgressStepStatus;
}

export interface FvProgressPanelProps
  extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  actions?: ReactNode;
  description?: ReactNode;
  log?: ReactNode;
  progress?: number;
  progressLabel?: ReactNode;
  stats?: ReactNode;
  steps?: FvProgressStep[];
  title: ReactNode;
}

export function FvProgressPanel({
  actions,
  className,
  description,
  log,
  progress,
  progressLabel,
  stats,
  steps,
  title,
  ...props
}: FvProgressPanelProps) {
  const normalizedProgress =
    typeof progress === "number"
      ? Math.max(0, Math.min(100, progress))
      : null;

  return (
    <section className={cx("fv-progress-panel", className)} {...props}>
      <div className="fv-progress-panel-header">
        <div>
          <h2 className="fv-card-title">{title}</h2>
          {description ? <p className="fv-body-muted">{description}</p> : null}
        </div>
        {actions ? <div className="fv-progress-panel-actions">{actions}</div> : null}
      </div>

      {normalizedProgress !== null ? (
        <div className="fv-progress-panel-meter">
          <div className="fv-progress-panel-meter-label">
            <span>{progressLabel ?? "Progress"}</span>
            <strong>{normalizedProgress}%</strong>
          </div>
          <div
            aria-label={typeof progressLabel === "string" ? progressLabel : "Progress"}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={normalizedProgress}
            className="fv-progress-track"
            role="progressbar"
          >
            <div
              className="fv-progress-fill"
              style={{ width: `${normalizedProgress}%` }}
            />
          </div>
        </div>
      ) : null}

      {steps?.length ? (
        <ol className="fv-progress-panel-steps">
          {steps.map((step, index) => (
            <li
              className={cx(
                "fv-gen-step",
                step.status === "complete" && "fv-gen-step-done",
                step.status === "active" && "fv-gen-step-active",
                step.status === "error" && "fv-gen-step-error",
              )}
              key={`${index}-${String(step.label)}`}
            >
              <span
                className={cx(
                  "fv-gen-circle",
                  step.status === "complete" && "fv-gen-circle-done",
                  step.status === "active" && "fv-gen-circle-active",
                  step.status === "pending" && "fv-gen-circle-future",
                  step.status === "error" && "fv-gen-circle-error",
                )}
              >
                {step.status === "complete" ? "✓" : index + 1}
              </span>
              <span className="fv-progress-panel-step-copy">
                <span className="fv-gen-step-title">{step.label}</span>
                {step.description ? (
                  <span className="fv-gen-step-sub">{step.description}</span>
                ) : null}
              </span>
              {step.meta ? <span className="fv-progress-panel-step-meta">{step.meta}</span> : null}
            </li>
          ))}
        </ol>
      ) : null}

      {log || stats ? (
        <div className="fv-progress-panel-footer">
          {log ? <div className="fv-progress-panel-log">{log}</div> : null}
          {stats ? <div className="fv-progress-panel-stats">{stats}</div> : null}
        </div>
      ) : null}
    </section>
  );
}
