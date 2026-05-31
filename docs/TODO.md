# TODO — Unimplemented Features

UI is visible but logic is missing. Pass this list to teammates.

---

## Features with UI but no real logic

### 1. Industry Templates — "Apply template" button does nothing
**File:** `src/app/settings/page.tsx` (tab "Industry Templates")  
**Problem:** The "Apply template" button navigates to `/` or `/source` but configures nothing — no project type, no filter presets, nothing.  
**What's needed:** On click, create a new project with the template's configuration (L2 process, Demo/MVP filters) pre-filled, or at minimum persist the template selection to project state.

---

### 2. AI Config settings are never sent to the generation API
**File:** `src/app/settings/page.tsx` (tab "AI Configuration")  
**Problem:** Users can configure model, temperature, and system prompt — all saved to `localStorage`. These values are never forwarded to the generation API at `src/app/api/generate/route.ts`.  
**What's needed:** Read AI preferences from `localStorage` (or a shared context) and include them in the generation API request body. The API already accepts model and prompt parameters — the client-side wiring is missing.

---

### 3. Project creation form has no template selection field
**File:** `src/components/phase1/project-home.tsx` (new project modal)  
**Problem:** The new project form has no field to pick an Industry Template. The user has no way to apply a template at project creation time.  
**What's needed:** Add an optional "Industry Template" field to the new project form, and apply the template's configuration to the created project.

---

## UX / Navigation issues

### 4. Settings sidebar nav disappears on mobile
**File:** `src/app/settings/page.tsx`  
**Problem:** The tab navigation sidebar (General, AI Config, Collaboration, etc.) has no mobile fallback — it disappears on small screens with no hamburger or drawer.  
**What's needed:** Add a mobile menu for the settings tabs, or switch to horizontal tabs on small screens.

---

## Notes

- Collaboration settings (`src/components/phase1/collaboration-settings.tsx`) hold local state only — nothing persists to the server unless Supabase is configured.
- The "Start Phase 2 →" button in Export Studio (`src/components/phase1/export-studio.tsx`) is correctly wired — it opens the Master Data flow when there are approved rows.
- The full Phase 2 flow (Setup → Process → Review → Export → Traceability) is implemented and functional.
- Mock mode (no Supabase) works for demos — login redirects to `/` and everything runs locally.
