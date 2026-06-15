# User Manual

Last updated: 2026-06-15

**Audience:** Critical Manufacturing consultants and pre-sales engineers.

---

## Overview

CM MES Demo Advisor helps you prepare MES demos for prospective customers. Starting from a customer requirements Excel file, the app guides you through two phases:

- **Phase 1** — generate and review AI-assisted requirement comments, then export a demo script.
- **Phase 2** — optionally generate and review Master Data objects for applicable approved requirements, then export a pilot package for partner MES import validation.

Both phases require a review step before any output is produced. The app never auto-approves or auto-imports — your judgment is the final gate.

---

## Getting Started

### Access

Open the app at the deployed URL or run it locally (`pnpm dev` from the project directory). If authentication is enabled, log in with your email and password. Without a Supabase configuration the app runs in local mock mode — all data stays in your browser.

### Creating a Project

1. On the Dashboard, click **New Project**.
2. Enter a project name (e.g. the customer company name).
3. Click **Create**. The project opens at the Source step.

### Reopening a Project

Click any project card on the Dashboard to reopen it at the last active step.

---

## Phase 1

### Step 1 — Source

Upload the customer requirements workbook:

1. Click **Browse files** and select the customer `.xlsx` file, or drag and drop it onto the upload area.
2. The app parses the `Requirements` sheet and shows a preview of the detected rows.
3. If the file looks correct, click **Analyze Requirements** to move to generation.

> A sample workbook (`Customer X Functional Requirements.xlsx`) is pre-loaded for testing. You can replace it at any time by uploading a new file.

### Step 2 — Generate

Select requirements and generate AI drafts:

1. Use the checkboxes to select the requirements you want to process, or click **Select All**.
2. Click **Generate** to start draft generation.
3. A progress log shows generation stages. Generation runs in mock mode by default. Real mode requires server-side MCP/RAG documentation lookup plus configured Bedrock or Anthropic provider credentials.
4. When complete, click **Review Results** to proceed.

### Step 3 — Review

Review and approve each requirement:

- The review workspace shows all requirements in a table.
- Click a row to open the detail panel with the AI-generated comment and confidence level.
- For each requirement you can:
  - **Approve** — accept the generated comment.
  - **Flag for Review** — mark as needing further attention.
  - **Skip** — exclude from the demo script.
  - **Edit** — modify the comment directly in the field.
- Use bulk actions to approve or flag multiple rows at once.
- When you are satisfied with the review, click **Proceed to Script**.

**Metrics visible in this step:**
- Requirements processed
- Approved count
- Pending / flagged count
- Average confidence level

### Step 4 — Script

Shape the demo narrative:

1. The script assembles approved requirements into sections.
2. You can reorder, edit, or remove sections.
3. When the script reflects the demo you want to deliver, click **Export**.

### Step 5 — Export

Download the Phase 1 output:

1. Click **Download Demo Script** to download a Markdown file.
2. The file can be opened in any text editor, converted to PDF, or shared as-is.
3. If you have approved Phase 1 rows, a **Start Phase 2** button appears to continue to Master Data generation.

---

## Phase 2

Phase 2 is only available after Phase 1 has approved rows. It produces a pilot Master Data package for partner MES import validation; it is not production/MES-import validated yet.

### Step 1 — Setup

1. Upload a Phase 2 requirements workbook (or reuse the Phase 1 workbook).
2. Click **Analyze Requirements**. The app identifies requirements applicable for Master Data generation.
3. Select the requirements and object types you want to generate (Enterprise, Site, Facility, Area, Resource, Product, Material).
4. Click **Generate Master Data** to proceed.

Mock mode is the safe default. The current pilot UI exposes lightweight advanced options for Phase 2 generation, but provider credentials and model access are still configured only on the server.

### Step 2 — Process

Generation progress is shown in a log panel. When complete, a summary shows the object counts by type. Click **Review Results** to proceed.

### Step 3 — Review

Review each generated Master Data object:

- Objects are grouped by type in the left panel.
- Select an object to see its fields, AI rationale, confidence level, warnings, and source requirements.
- Edit any field directly. Required fields are marked with *.
- Click **Approve** to approve the object and move to the next.
- Click **Flag for Review** to mark it for further attention.
- When all objects are approved, click **Proceed to Export**.

**Per-object indicators:**
- Confidence level (high / medium / low)
- Warnings (e.g. template-derived default fields)
- Source requirements linked to the object

### Step 4 — Export

1. The export page shows a summary: approved, flagged, pending, and total counts per object type.
2. When all objects are approved, click **Download Master Data Package**.
3. The download contains an Excel workbook and a JSON manifest.
4. Click **View Traceability** (available after download) to inspect the full audit trail.

> The exported package is a pilot demo artifact. It is not MES-validated until a consultant manually imports it via **Administration → Master Data Package** in the MES environment.

### Step 5 — Traceability

The traceability view shows a searchable table linking every source requirement to the Master Data objects and fields it generated.

- Search by requirement ID, object name, field, or value.
- Use this view to verify coverage before presenting the demo to the customer.

---

## Settings

Access settings from the top navigation bar.

| Tab | Description |
|---|---|
| General | Consultant name, MES version, and language — these appear in generated outputs |
| AI Configuration | Safe generation preferences: confidence threshold, curated generation profile, verbosity, and explanations. This is not a raw model, temperature, or system-prompt editor |
| Industry Templates | Reusable project templates by industry (Electronics, Semiconductor, Medical Devices) |
| About | Project activity stats — requirements processed, approved count, projects active |
| Collaboration | Invite team members and manage project roles |

---

## Project Collaboration

Project owners can invite collaborators:

1. Open the project → **Settings → Collaboration**.
2. Enter the collaborator's email and select a role (**Editor** or **Viewer**).
3. Click **Send Invite**. The collaborator receives an email with an accept link.

| Role | Permissions |
|---|---|
| Owner | Full access — invite, remove members, archive, delete |
| Editor | Read and write — can save review decisions and edits |
| Viewer | Read only — cannot save changes |

---

## Frequently Asked Questions

**Can I use the app without internet access?**
In mock mode, yes. The app works fully offline for Phase 1 and Phase 2 generation. Real mode (AI and MES integration) requires the partner-configured server connections.

**Is AI generation automatic?**
No. Generation always requires a manual trigger and produces drafts that must be reviewed and approved before any output is produced.

**Can I go back to a previous step?**
Yes. Use the sidebar navigation to return to any completed step. Steps that depend on later actions (e.g. traceability requires export) enforce a forward gate.

**What happens if I close the browser mid-review?**
In mock mode, state is saved in your browser's local storage. In Supabase mode, Phase 1 state is persisted server-side. Phase 2 state is browser-local in the current pilot scope.

**Is the Master Data package directly importable into MES?**
Not yet as a production claim. The package is generated with template-backed defaults designed for import compatibility, but Critical Manufacturing still needs to validate it by manually importing it via **Administration → Master Data Package** in the MES environment.
