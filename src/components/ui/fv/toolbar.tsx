import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./utils";

export interface FvToolbarProps extends HTMLAttributes<HTMLDivElement> {
  left?: ReactNode;
  right?: ReactNode;
}

export function FvToolbar({
  children,
  className,
  left,
  right,
  ...props
}: FvToolbarProps) {
  return (
    <div className={cx("fv-toolbar", className)} {...props}>
      <div className="fv-toolbar-left">{left ?? children}</div>
      {right ? <div className="fv-toolbar-right">{right}</div> : null}
    </div>
  );
}
