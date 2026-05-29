# UI Revamp Settings Behavior Contracts

Issue #59 defines the safe behavior layer that later UI revamp work can consume
without turning settings into fake controls or exposing provider configuration.

## Why This Exists

The UI revamp splits visual route work across several issues. Settings touches
New Project, Generate, Script Export, and About, so those routes need bounded
contracts before they add visible controls.

These contracts are intentionally narrow:

- Industry templates provide stable IDs and display defaults for #50, #62, and
  #66.
- AI preferences expose safe aliases and bounded values for #51, #64, and #66.
- General output preferences expose consultant/version/language metadata for
  #54, #65, and #66.
- Usage stats expose only metrics backed by real project or requirement data for
  #55 and #66.

## Import Paths

Use the public settings barrel:

```ts
import {
  computeSettingsUsageStats,
  formatGeneralOutputMetadata,
  industryTemplateDefinitions,
  normalizeSettingsBehaviorSnapshot,
} from "@/lib/settings";
```

Route code should not import from deep settings files unless a test needs a
specific helper.

## Industry Template Contract

Source: `src/lib/settings/industry-templates.ts`

Industry templates are identified by durable IDs:

- `electronics`
- `automotive`
- `medical`
- `food`
- `aerospace`
- `generic`

Each template has a label, description, process guidance, requirement focus,
and optional Phase 2 object-type hints. The hints are limited to existing
`MasterDataObjectType` values.

Templates do not create projects, mutate source rows, generate requirements, or
activate Phase 2. Later UI work should persist only the template ID or an
explicit project setting, then let downstream routes decide how to present the
template defaults.

## Safe AI Preferences Contract

Source: `src/lib/settings/contracts.ts`

Allowed model aliases:

- `default`
- `grounded-draft`
- `review-focused`

Allowed verbosity values:

- `low`
- `medium`
- `high`

Confidence threshold is rounded and clamped to `50..95`. `includeExplanations`
must be a boolean. Raw provider model IDs, system prompts, temperature, top-p,
API keys, and secrets are not part of the contract.

Generation request parsing now returns a normalized settings snapshot when a
client sends one, but provider behavior remains unchanged until #64 wires a
server-validated interpretation.

## General Output Metadata Contract

Source: `src/lib/settings/contracts.ts`

Supported output metadata:

- Consultant name, normalized and capped at 120 characters.
- MES version: `cm-v8`, `cm-v9`, or `cm-v10`.
- Output language: `en`, `pt`, or `es`.

Language preference is stored as metadata only. It must not imply that existing
generated content is translated. Use `formatGeneralOutputMetadata` when export
or script surfaces need honest display text.

`serializeDemoScriptToMarkdown` accepts optional `outputPreferences`. Existing
callers do not pass it yet, so current export behavior remains unchanged.

## About Stats Contract

Source: `src/lib/settings/usage-stats.ts`

`computeSettingsUsageStats` reports counts only when project or requirement
inputs are provided. Missing data returns `null`, not placeholder numbers.

Unsupported metrics are explicit:

- export count requires durable export tracking
- hours saved requires time tracking
- AI accuracy requires evaluation data

About UI work should display unsupported metrics honestly instead of hardcoding
demo values.

## Out Of Scope For #59 Slice A

- No Settings UI redesign.
- No persistence migration.
- No route adoption in New Project, Generate, Script Export, or About.
- No provider/model configuration changes.
- No prompt editing or raw model selection.
- No workflow route gate changes.
- No Phase 2 activation requirement.

## Examples For Teammates

New Project or Settings template selector:

```ts
import { industryTemplateDefinitions } from "@/lib/settings";
```

Generate request client:

```ts
import { normalizeSettingsBehaviorSnapshot } from "@/lib/settings";

const settings = normalizeSettingsBehaviorSnapshot(savedSettings);
```

Script export metadata:

```ts
import { formatGeneralOutputMetadata } from "@/lib/settings";
```

About stats:

```ts
import { computeSettingsUsageStats } from "@/lib/settings";
```

## What Remains

#66 should add the Settings UI and decide how settings persist. #62, #64, and
#65 should adopt only the specific parts they need. #59 Slice A does not make
settings visible or behavioral by itself.
