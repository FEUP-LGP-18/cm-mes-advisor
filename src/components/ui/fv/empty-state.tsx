import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./utils";

export interface FvEmptyStateProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  action?: ReactNode;
  body?: ReactNode;
  icon?: ReactNode;
  title: ReactNode;
}

export function FvEmptyState({
  action,
  body,
  children,
  className,
  icon,
  title,
  ...props
}: FvEmptyStateProps) {
  return (
    <div className={cx("fv-empty", className)} {...props}>
      {icon ? <div className="fv-empty-icon">{icon}</div> : null}
      <div className="fv-empty-title">{title}</div>
      {body ? <div className="fv-empty-body">{body}</div> : null}
      {children}
      {action ? <div className="fv-empty-actions">{action}</div> : null}
    </div>
  );
}
