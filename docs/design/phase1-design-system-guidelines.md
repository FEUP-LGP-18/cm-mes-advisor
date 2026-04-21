# Phase 1 Design System Guidelines

This document is the design-system source of truth for frontend work in `cm-mes-advisor/`.

## Source Of Truth

- Tokens live in [`src/app/theme-tokens.css`](../../src/app/theme-tokens.css).
- Shared surface classes and layout rules live in [`src/app/globals.css`](../../src/app/globals.css).
- Product-specific UX direction lives in:
  - [`docs/design/agent-ui-canon.md`](./agent-ui-canon.md)
  - [`docs/design/phase1-ui-audit-2026-04-21.md`](./phase1-ui-audit-2026-04-21.md)
- Repo workflow rules live in [`AGENTS.md`](../../AGENTS.md).

## Token Rules

- Reuse semantic tokens first: `--background`, `--panel`, `--document`, `--line`, `--brand-primary`, `--amber`, `--danger`.
- Treat the dark theme as the default operating environment and the light theme as a supported alternate mode.
- Add new tokens only when the value is meaningfully reusable across surfaces or states.
- Prefer semantic aliases over raw hex or rgba values in component code.

## Typography

- Primary UI text uses `Instrument Sans` through the `--font-display` variable.
- Monospace or data-heavy utility text uses `IBM Plex Mono` through `--font-mono`.
- Use typography to express hierarchy before adding more borders, chips, or decoration.
- Consultant-facing product copy should stay operational and scannable.

## Spacing And Layout

- Default density is comfortable-compact.
- Use generous spacing between regions and tighter spacing within a region.
- Prefer shells, rails, queue-detail layouts, and editor-detail layouts over card mosaics.
- Treat cards as optional grouping primitives, not a default layout solution.

## Radius, Borders, And Shadows

- Reuse the current rounded language already encoded in shared classes.
- Keep borders low-contrast and rely on `--line` / `--line-strong`.
- Use shadow tokens sparingly: emphasis should come from hierarchy and placement, not heavy layering.

## State Semantics

- Positive or ready states should reuse the existing token vocabulary instead of introducing new greens.
- Warning and blocked states should remain restrained and readable.
- Error or destructive states should route through the existing `--danger` family.
- Focus treatment should reuse the shared `focus-premium` behavior.

## Motion

- Keep motion purposeful and low-noise.
- Prefer state transitions that reinforce navigation, reveal hierarchy, or confirm completion.
- Do not add decorative motion to routine product surfaces.

## Implementation Rules

- Reuse shared Phase 1 classes before adding local one-off classes.
- If a new style pattern repeats across screens, promote it into the shared surface layer.
- If a token change would materially alter the product look, verify it in desktop and mobile before signoff.
- Any new visual pattern should still read like the same Phase 1 workspace, not a parallel design system.
