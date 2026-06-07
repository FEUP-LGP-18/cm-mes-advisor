import type { CSSProperties } from "react";

const STROKE = { fill: "none", stroke: "currentColor", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const INLINE: CSSProperties = { display: "inline-block", verticalAlign: "-0.1em", flexShrink: 0 };

export function ArrowLeft({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" {...STROKE} strokeWidth="1.8" aria-hidden="true" style={INLINE}>
      <line x1="13" y1="8" x2="3" y2="8" />
      <polyline points="7 4 3 8 7 12" />
    </svg>
  );
}

export function ArrowRight({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" {...STROKE} strokeWidth="1.8" aria-hidden="true" style={INLINE}>
      <line x1="3" y1="8" x2="13" y2="8" />
      <polyline points="9 4 13 8 9 12" />
    </svg>
  );
}

export function ArrowDown({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" {...STROKE} strokeWidth="1.8" aria-hidden="true" style={INLINE}>
      <line x1="8" y1="2" x2="8" y2="11" />
      <polyline points="4 7.5 8 12 12 7.5" />
      <line x1="2" y1="14" x2="14" y2="14" />
    </svg>
  );
}

export function Check({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" {...STROKE} strokeWidth="2.2" aria-hidden="true" style={INLINE}>
      <polyline points="3 8 6.5 11.5 13 4.5" />
    </svg>
  );
}

export function WarningTriangle({ size = 13, style }: { size?: number; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" {...STROKE} strokeWidth="1.8" aria-hidden="true" style={{ ...INLINE, ...style }}>
      <path d="M8 3L14 13H2L8 3Z" />
      <line x1="8" y1="7" x2="8" y2="10" />
      <circle cx="8" cy="12.5" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function Retry({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" {...STROKE} strokeWidth="1.8" aria-hidden="true" style={INLINE}>
      <path d="M13.5 7A5.5 5.5 0 1 0 12 11" />
      <polyline points="13 3.5 13.5 7 10 7" />
    </svg>
  );
}
