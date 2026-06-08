# Requirements — User Stories

Last updated: 2026-06-07

This document lists the user stories developed throughout the project, grouped by functional area. Stories are sourced directly from GitHub issues and from feature development tracked in pull requests.

---

## Authentication and Session

**As a user, I can sign up, sign in, reset my password, stay signed in, and sign out so my project work is protected.**
_(#14 — Auth flows and protected session shell)_

- Unauthenticated users are redirected to login before accessing any project, settings, or profile page.
- Login and signup use email and password.
- Password reset sends an email and allows setting a new password via a callback link.
- Session persists across page refresh.
- Logout clears the session and returns the user to login.

---

## Project Management

**As a consultant, I can create and reopen projects so I can manage multiple customer engagements separately.**

- A project is the top-level unit — one project per customer engagement.
- Projects can be created from the dashboard with a name and optional description.
- Projects can be reopened from the dashboard and resume from the last active step.

**As a project owner, I can invite collaborators by email so my team can work together on the same project.**
_(#25 — Project collaboration settings UI)_

- Owners can invite users with editor or viewer roles.
- Invites are sent by email and accepted via a link.
- Owners can remove members and change roles.

**As a project owner, I can archive or delete a project when it is no longer needed.**
_(#26 — Project settings, ownership, archive, and delete)_

---

## Phase 1 — Requirements Workflow

**As a consultant, I can upload a customer requirements workbook so I can begin the MES demo preparation workflow.**

- The app accepts `.xlsx` files with a `Requirements` sheet.
- Row 2 is the real header row; Excel row numbers are preserved for traceability.
- A committed sample workbook is available for onboarding and local testing.

**As a consultant, I can generate AI-assisted draft comments for selected requirements so I have a starting point for demo preparation.**

- Requirements can be selected individually or in bulk.
- Generation runs in mock mode locally or in real mode with partner credentials.
- The generation step produces draft comments and demo guidance per requirement.

**As a consultant, I can review, approve, flag, and edit generated requirement comments so the demo output reflects my professional judgment.**
_(#60 — Requirements Review dense table workspace)_

- Review is a dense table workspace with per-row selection and inline editing.
- Requirements can be approved, flagged for review, skipped, or edited.
- Bulk actions apply to checked rows.
- A no-results state is shown when filters return nothing.

**As an editor, my generation results, review decisions, script edits, and export readiness are saved to the project and visible to collaborators.**
_(#21 — Persist Phase 1 workflow state to Supabase)_

- Phase 1 state is persisted server-side when Supabase is configured.
- Refreshing or reopening the project restores the last saved state.
- Viewers cannot save changes; editors and owners can.

**As a consultant, I can generate a demo script that summarises approved requirements for the customer meeting.**
_(#65 — Script, Export, and Handoff)_

- The script assembles approved requirements into a consultant-facing narrative.
- Consultant name and MES version from General Preferences appear in output metadata when set.

**As a consultant, I can download a Markdown handoff document that captures the Phase 1 output for the customer record.**
_(#65 — Script, Export, and Handoff)_

- Export is available once there are approved requirements.
- The download is a Markdown file suitable for sharing or archiving.

---

## Phase 2 — Master Data

**As a consultant, I can continue from Phase 1 to a Phase 2 Master Data generation workflow so I can produce a demo-ready MES data package.**

- Phase 2 is only available after Phase 1 rows are approved.
- The Phase 2 flow is: Setup → Process → Review → Export → Traceability.
- Phase 2 is a pilot demo path and does not require Phase 1 completion to be considered done.

**As a consultant, I can select applicable requirements and object types so the Master Data generation is scoped to what the customer needs.**

- Setup lets the consultant upload a requirements workbook and select object types (Enterprise, Site, Facility, Area, Resource, Product, Material).
- Requirements can be selected individually or in bulk.

**As a consultant, I can review and approve generated Master Data objects before exporting so the package reflects my review.**
_(#67 — Phase 2 Master Data screens)_

- Objects are presented in a review workspace grouped by type.
- Each object shows its fields, AI rationale, confidence level, warnings, and source requirements.
- Objects can be approved, flagged, or edited field-by-field.

**As a consultant, I can download a Master Data package when all objects are approved so it is ready for import into CM MES.**

- The download includes an Excel workbook and a JSON manifest.
- The export is only available when all objects are approved.

**As a consultant, I can view a traceability report linking each source requirement to the Master Data objects and fields it generated.**

- Traceability is accessible after the package is downloaded.
- The report is searchable by requirement, object, field, or value.

---

## Settings and Profile

**As a user, I can configure general preferences (consultant name, MES version, language) so they appear in generated outputs.**
_(#54 — General Prefs)_

**As a user, I can configure AI generation behavior (model, temperature, system prompt) so generation reflects my preferred style.**
_(#51 — AI Config)_

**As a user, I can view my profile and update my display name and avatar.**
_(#15 — Profile and account management)_

---

## Non-Functional Requirements

- The app runs in mock mode locally without partner credentials; real mode requires server-side Bedrock and MCP configuration.
- All partner credentials (Bedrock, AWS, MCP, MES) are server-side only and never exposed to the browser.
- Route protection is enforced by the Next.js proxy layer; unauthenticated requests to protected routes return 401 or redirect to login.
- Mobile layout is required for all product surfaces.
- Phase 2 exports are pilot demo artifacts and are not MES-validated until a partner manually imports and accepts the package.
