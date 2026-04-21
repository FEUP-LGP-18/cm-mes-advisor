---
name: figma-implementation-rules
description: Use when implementing or refining a screen from Figma, when a task includes a Figma file or frame link, or when this repo uses Figma MCP context. Trigger for frame-accurate implementation, design-system-aware refinements, or translating Figma intent into repo code. Do not use when no design context exists or when the task is unrelated to Figma-informed UI work.
---

# Figma Implementation Rules

Use this skill whenever design context comes from Figma or Figma MCP.

## Required Inputs

Before coding, gather or request:

1. The exact Figma file or selection link
2. The target frame or node context
3. A screenshot or rendered reference when useful
4. Any relevant notes about breakpoints, modes, or variants

## Working Rules

- Start from design context, not from guesses.
- Reuse existing repo tokens, spacing, typography, and component patterns before creating new code paths.
- Translate Figma intent into this repo’s conventions instead of cloning raw generated markup.
- Preserve hierarchy, spacing rhythm, responsiveness, and state behavior from the design.
- Document mismatches when the design and the repo’s current system diverge.
- Avoid placeholder assets when Figma already provides usable references.

## Figma MCP Guidance

- Prefer the remote Figma MCP server when available.
- Use the exact file URL or selection URL so Codex can resolve the right node.
- Pull screenshots or design context before implementing large or detailed surfaces.
- For write-to-Figma workflows, inspect first and make smaller, system-aware updates instead of one giant blind generation pass.

## Stop Conditions

- If the frame context is vague, stop guessing and narrow the target node first.
- If the requested output conflicts with the repo’s established product truth, call out the mismatch and adapt intentionally.
