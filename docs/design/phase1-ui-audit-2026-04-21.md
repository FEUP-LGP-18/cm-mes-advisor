# Phase 1 UI Audit

Date: `2026-04-21`

This audit records the baseline issues that justified the Phase 1 redesign and the routing reset.

## Summary

- The previous entry screen mixed a landing-page hero with an operational workspace, which slowed orientation and hid the real first action.
- Phase 1 lived inside one large route, so source confirmation, generation, review, script work, and export all competed for attention.
- The visual system leaned too hard on framed regions, chips, and premium treatment for routine work surfaces.
- The product treated the workbook as the top-level object instead of the project, which made continuity, reopening, and progress tracking feel fragile.

## Surface Findings

### Entry / Project Home

- Task-flow clarity: `2/5`
- Visual hierarchy: `2/5`
- Copy quality: `3/5`
- Mobile fit: `3/5`
- State coverage: `2/5`
- Overall polish: `2/5`
- Blocking findings:
  - The first viewport read like a pitch surface rather than a working consultant tool.
  - The page did not establish `project` as the main unit of work.
  - Empty-state guidance was buried under branding and context chrome.

### Source Confirmation

- Task-flow clarity: `3/5`
- Visual hierarchy: `3/5`
- Copy quality: `4/5`
- Mobile fit: `3/5`
- State coverage: `3/5`
- Overall polish: `3/5`
- Blocking findings:
  - Source validation existed, but it was buried inside a larger mixed-purpose page.
  - Upload, source identity, and continuation cues were not isolated enough to build confidence.

### Generate

- Task-flow clarity: `3/5`
- Visual hierarchy: `3/5`
- Copy quality: `3/5`
- Mobile fit: `3/5`
- State coverage: `3/5`
- Overall polish: `3/5`
- Blocking findings:
  - Recommended generation and expert selection were visually too close together.
  - Generation lived beside too much surrounding context, so it did not feel like a clear staged action.

### Review

- Task-flow clarity: `4/5`
- Visual hierarchy: `3/5`
- Copy quality: `4/5`
- Mobile fit: `3/5`
- State coverage: `3/5`
- Overall polish: `3/5`
- Blocking findings:
  - The review model was the strongest part of the product, but it was not clearly positioned as the core Phase 1 workspace.
  - Decorative summary treatment still competed with the queue-detail flow.

### Script

- Task-flow clarity: `3/5`
- Visual hierarchy: `3/5`
- Copy quality: `4/5`
- Mobile fit: `3/5`
- State coverage: `3/5`
- Overall polish: `3/5`
- Blocking findings:
  - Script editing worked, but its place in the sequence was visually unclear because the workflow lived in one page.

### Export

- Task-flow clarity: `3/5`
- Visual hierarchy: `3/5`
- Copy quality: `4/5`
- Mobile fit: `3/5`
- State coverage: `3/5`
- Overall polish: `3/5`
- Blocking findings:
  - Export readiness did not feel like the clean completion moment of Phase 1.
  - Phase 2 scope language risked visually overshadowing the actual finish line.

## Implemented Direction

- Promote `project` to a first-class local entity with registry-based persistence.
- Split Phase 1 into route-based screens for `source`, `generate`, `review`, `script`, and `export`.
- Introduce a shared shell with a progress rail, project identity, and one dominant action per surface.
- Keep the premium-dark direction, but shift emphasis from glow and card stacking to hierarchy, layout, and state clarity.

## Workflow Rule

Future UI work on this product should use the sequence:

1. `$ui-surface-planner`
2. `$mes-product-ui`
3. `$frontend-skill` when the work is visually led
4. `$ui-quality-gate` before signoff
