import type { CSSProperties, TableHTMLAttributes } from "react";
import { cx } from "./utils";

export interface FvTableProps extends TableHTMLAttributes<HTMLTableElement> {
  minWidth?: CSSProperties["minWidth"];
  wrapClassName?: string;
}

export function FvTable({
  children,
  className,
  minWidth = "720px",
  style,
  wrapClassName,
  ...props
}: FvTableProps) {
  return (
    <div className={cx("fv-table-wrap", "fv-table-wrap-scroll", wrapClassName)}>
      <table
        className={cx("fv-table", className)}
        style={{ minWidth, ...style }}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}
