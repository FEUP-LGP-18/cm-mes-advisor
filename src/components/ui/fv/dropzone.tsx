import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./utils";

export type FvDropzoneState = "idle" | "active" | "uploaded" | "error";

const dropzoneStateClass: Record<FvDropzoneState, string> = {
  active: "fv-dropzone-active",
  error: "fv-dropzone-error",
  idle: "",
  uploaded: "fv-dropzone-ready",
};

export interface FvDropzoneProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  action?: ReactNode;
  body?: ReactNode;
  icon?: ReactNode;
  meta?: ReactNode;
  state?: FvDropzoneState;
  title: ReactNode;
}

export function FvDropzone({
  action,
  body,
  children,
  className,
  icon,
  meta,
  state = "idle",
  title,
  ...props
}: FvDropzoneProps) {
  return (
    <div
      aria-busy={state === "active" ? true : undefined}
      aria-invalid={state === "error" ? true : undefined}
      className={cx("fv-dropzone", dropzoneStateClass[state], className)}
      role="group"
      {...props}
    >
      {icon ? <div className="fv-dropzone-icon">{icon}</div> : null}
      <div className="fv-dropzone-title">{title}</div>
      {body ? <div className="fv-dropzone-sub">{body}</div> : null}
      {children}
      {action ? <div className="fv-dropzone-action">{action}</div> : null}
      {meta ? <div className="fv-dropzone-meta">{meta}</div> : null}
    </div>
  );
}
