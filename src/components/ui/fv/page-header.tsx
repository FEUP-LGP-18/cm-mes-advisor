import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./utils";

type HeadingLevel = 1 | 2 | 3;

export interface FvPageHeaderProps
  extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  actions?: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  headingLevel?: HeadingLevel;
  title: ReactNode;
}

export function FvPageHeader({
  actions,
  children,
  className,
  description,
  eyebrow,
  headingLevel = 1,
  title,
  ...props
}: FvPageHeaderProps) {
  const titleNode =
    headingLevel === 2 ? (
      <h2 className="fv-page-title">{title}</h2>
    ) : headingLevel === 3 ? (
      <h3 className="fv-page-title">{title}</h3>
    ) : (
      <h1 className="fv-page-title">{title}</h1>
    );

  return (
    <header className={cx("fv-page-header", className)} {...props}>
      <div className="fv-page-header-main">
        {eyebrow ? <div className="fv-page-header-eyebrow">{eyebrow}</div> : null}
        {titleNode}
        {description ? (
          <p className="fv-page-subtitle">{description}</p>
        ) : null}
        {children}
      </div>
      {actions ? <div className="fv-page-header-actions">{actions}</div> : null}
    </header>
  );
}
