# Phase 1 Visual System

This document describes the shipped Phase 1 UI language in `/Users/mahmoudali/Documents/LGP project dicovery/cm-mes-advisor/src/app/globals.css` and `/Users/mahmoudali/Documents/LGP project dicovery/cm-mes-advisor/src/app/layout.tsx`.

## Intent

Phase 1 should feel like a premium internal tool, not a marketing site and not a generic AI dashboard. The visual system is calm, dense, and consultant-facing:

- warm neutrals instead of pure black or pure white
- one restrained cobalt accent family
- clear surface hierarchy before decoration
- mono reserved for metadata, system labels, and traceability
- editing and review work surfaces outrank shell chrome

## Typography

The app font stack is defined in `/Users/mahmoudali/Documents/LGP project dicovery/cm-mes-advisor/src/app/layout.tsx`.

- Primary UI font: `Instrument Sans`
  - bound to `--font-display`
  - used for headings, body copy, buttons, table content, and editor UI
- Metadata font: `IBM Plex Mono`
  - bound to `--font-mono`
  - used for overlines, chips, row labels, status labels, and traceability details

Usage rules:

- use `Instrument Sans` for all product reading and action surfaces
- use mono only for compact metadata or system context
- keep headings tight with negative tracking already established in the codebase
- avoid decorative type treatments or additional font families

## Color Tokens

### Dark Theme

Core dark tokens in `:root`:

- Canvas: `--background: #111316`
- Main shell surfaces:
  - `--shell-surface: rgba(21, 24, 29, 0.94)`
  - `--shell-surface-strong: rgba(18, 21, 26, 0.98)`
  - `--shell-card-surface: rgba(27, 31, 37, 0.96)`
- Document/editor surfaces:
  - `--document: rgba(18, 21, 26, 0.99)`
  - `--document-contrast-surface: #242a33`
- Text:
  - `--shell-ink: #f3f1ec`
  - `--shell-muted: #b8b0a4`
  - `--shell-subtle: #8f8b83`
- Accent:
  - `--brand-primary: #4f73ab`
  - `--brand-primary-hover: #5e84bf`
  - `--brand-accent: #8eabc8`
  - `--brand-accent-soft: #cdd9e7`
- Utility/status:
  - `--brand-slate: #5b6470`
  - `--amber: #c5a66a`
  - `--danger: #d27c70`

### Light Theme

Core light tokens in `:root[data-theme="light"]`:

- Canvas: `--background: #efe9df`
- Main shell surfaces:
  - `--shell-surface: rgba(251, 248, 242, 0.95)`
  - `--shell-surface-strong: rgba(255, 252, 247, 0.99)`
  - `--shell-card-surface: rgba(255, 252, 247, 0.98)`
- Document/editor surfaces:
  - `--document: rgba(255, 252, 247, 0.99)`
  - `--document-contrast-surface: #222731`
- Text:
  - `--shell-ink: #17191d`
  - `--shell-muted: #5b574e`
  - `--shell-subtle: #8d877d`
- Accent:
  - `--brand-primary: #395f98`
  - `--brand-primary-hover: #466fad`
  - `--brand-accent: #6e8db0`
  - `--brand-accent-soft: #36598c`
- Utility/status:
  - `--brand-slate: #7d8793`
  - `--amber: #a78340`
  - `--danger: #b96358`

### Semantic Usage

- `--background`: app canvas only
- `--shell-*`: workspace shells, nav, tables, rails, review chrome
- `--document-*`: script/export editing surfaces
- `--line` and `--shell-border`: default separators and low-contrast borders
- `--brand-primary`: primary CTA, active step state, selected emphasis
- `--danger`: blocked/error feedback only
- `--amber`: cautionary or warning signals only

Do not introduce a second accent hue for routine product UI.

## Spacing, Radius, And Elevation

The system favors soft corners and moderate elevation.

- Large product surfaces:
  - `border-radius: 1.75rem` for desk cards, header shell, section cards
- Mid-sized work surfaces:
  - `border-radius: 1.5rem` to `1.35rem` for rails, grouped cards, editor panels
- Chips and pills:
  - `border-radius: 999px`
- Compact metadata strip items:
  - `border-radius: 0.95rem`

Shadows:

- general shell elevation: `--shadow-soft`
- stronger emphasis: `--shadow-strong`
- document/editor surfaces: `--shadow-document`
- primary CTA emphasis: `--shadow-button-primary`

Spacing rules:

- shell surfaces usually use `1.25rem` internal padding
- rails usually use `1.1rem`
- metadata chips use tighter `0.65rem 0.8rem`
- prefer adding whitespace between content groups before adding more borders

## Surface Patterns

### App Canvas

The canvas uses a restrained atmospheric background:

- radial cobalt glow near the top corners
- subtle grid overlay
- very low-opacity dot texture

This is background atmosphere, not a hero effect. Keep it faint.

### Top Bar

The top bar leads with product and Critical Manufacturing branding, with U.Porto secondary. It should read as a product shell, not a landing-page navbar.

### Project Shell

The project shell has three layers:

1. breadcrumbs and compact phase pills
2. project title plus short next-action helper copy
3. dense metadata strip

The metadata strip is the replacement for the older oversized cards. It should contain:

- workbook
- next action
- rows
- pending review
- approved
- export state when relevant

These are micro-panels, not dashboard widgets.

### Stage Navigation

The five-step navigation uses:

- mono eyebrow for status
- title for the step noun
- small subtitle for the task framing

Active state uses cobalt tinting. Blocked state lowers emphasis instead of hiding the step.

### Review Surface

Review is the most task-heavy surface and should keep:

- queue/navigation secondary
- current requirement primary
- decision actions persistent
- evidence and explorer tools accessible but not dominant

### Script And Export Surfaces

Script uses document-style surfaces and editing layout.

- left/main: actual writing and section work
- right rail: readiness, coverage, traceability, next step

Export stays narrower.

- main area: included content and coverage
- rail: readiness checklist and final actions

## Controls

### Buttons

- primary CTA: `theme-button-primary`
  - reserved for the dominant action on the surface
- secondary shell CTA: `theme-shell-button-secondary`
  - used for alternate navigation and non-destructive actions
- document secondary CTA: `theme-doc-button-secondary`
  - used inside the script/editor surfaces

Rules:

- one primary action per major surface
- do not place multiple competing primary buttons in the same band
- disabled state relies on opacity and cursor change, not hidden actions

### Inputs

Inputs inherit the visual system through:

- `theme-shell-input` on shell/workspace surfaces
- `theme-doc-input` on script/document surfaces

Use:

- shell inputs for search, select, filters, and compact form actions
- document inputs for script title, notes, and narrative editing

## Theme Behavior

Theme behavior is defined in:

- `/Users/mahmoudali/Documents/LGP project dicovery/cm-mes-advisor/src/app/layout.tsx`
- `/Users/mahmoudali/Documents/LGP project dicovery/cm-mes-advisor/src/app/theme.ts`
- `/Users/mahmoudali/Documents/LGP project dicovery/cm-mes-advisor/src/app/theme-toggle.tsx`

Rules:

- theme is applied via `data-theme` on the root html element
- initialization happens before interactive hydration through `themeInitScript`
- both themes must feel equally intentional
- light mode is not a washed-out fallback
- dark mode is not neon or glass-heavy

## Do / Don’t

Do:

- keep product screens operational and scannable
- use accent color sparingly for action and focus
- keep summary information dense when it is not the main task
- let editors, queues, and tables dominate task-heavy screens
- prefer calm borders and surface contrast over decorative gradients

Don’t:

- rebuild product UI as card mosaics
- use large summary cards for tiny bits of metadata
- add a second accent family for novelty
- make routine workspace screens feel like a landing page
- let navigation chrome outrank the current user task
