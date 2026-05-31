import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./utils";

export interface FvInspectorPanelProps
  extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  actions?: ReactNode;
  footer?: ReactNode;
  metadata?: ReactNode;
  sticky?: boolean;
  title: ReactNode;
}

export function FvInspectorPanel({
  actions,
  children,
  className,
  footer,
  metadata,
  sticky = false,
  title,
  ...props
}: FvInspectorPanelProps) {
  return (
    <aside
      aria-label={typeof title === "string" ? title : undefined}
      className={cx("fv-inspector-panel", sticky && "fv-inspector-panel-sticky", className)}
      {...props}
    >
      <div className="fv-inspector-panel-header">
        <div>
          <h2 className="fv-card-title">{title}</h2>
          {metadata ? <div className="fv-inspector-panel-meta">{metadata}</div> : null}
        </div>
        {actions ? <div className="fv-inspector-panel-actions">{actions}</div> : null}
      </div>
      <div className="fv-inspector-panel-body">{children}</div>
      {footer ? <div className="fv-inspector-panel-footer">{footer}</div> : null}
    </aside>
  );
}
