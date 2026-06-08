# Findings and Metrics — Build-Measure-Learn

Last updated: 2026-06-07

---

## Overview

**MESMate** (Group 18, LGP 2025/2026) built the AI-Guided MES Configuration Advisor in partnership with Critical Manufacturing. This document records the findings, iterations, and metrics gathered during the Build-Measure-Learn phase (April–June 2026). The team followed an iterative delivery model with 2-week mini-sprints, shipping working software in increments and validating with the partner and the academic advisor at key milestones.

**Target impact (from Strategic Plan):** reduce initial MES configuration effort by 40–60%, and reduce late-stage rework costs (currently 15–25% of total project budgets) through better early-stage accuracy.

---

## Timeline

| Date | Milestone |
|---|---|
| **06 Mar 2026** | **KOM** — Kick-off Meeting at Critical Manufacturing / Remote; all 11 members + Rui Barbosa; confirmed LLM as decision-support tool, not black box; initial tech stack: MCP + LibreChat |
| **27 Mar 2026** | **Ideation Finish** — Review Meeting; Project Charter + PVP delivered, signed by João Faria, Rui Barbosa, Gonçalo Araújo |
| **07 Apr 2026** | **Strategic Review** — progress presentation; BML phase begins |
| 24 Apr 2026 | Sprint planning session (45 min) — work distributed across 4 engineers for auth/collaboration track |
| April 2026 | Phase 1 core implementation (source → generate → review → script → export) |
| April 2026 | Real-mode Bedrock integration implemented; 403 credential issue identified |
| Apr–May 2026 | Auth and collaboration layer (Supabase schema, project roles, invites) |
| May 2026 | Phase 2 Master Data pilot (setup → process → review → export → traceability) |
| **29 May 2026** | **Beta Version** — Final Event Script (SFE) + Intermediate Strategic Plan delivered |
| May–Jun 2026 | UI revamp — full design system from MM mockups (Polina Andreeva, Dayo Ashaolu), applied across all surfaces |
| June 2026 | Academic advisor review meeting — João Pascoal Faria (45 min, UX feedback, metrics guidance) |
| June 2026 | Final partner validation meeting with Rui Barbosa — positive outcome |
| **08 Jun 2026** | **Delivery — Final MVP delivered** |
| **12 Jun 2026** | **Final Event presentation** — partner (Rui Barbosa) attending |
| **26 Jun 2026** | **Closure** — Final Strategic Plan, Final Management Report, Project Folder |

---

## Value Proposition

The product delivers value across three dimensions validated with the partner:

| Value | Description |
|---|---|
| **Speed** | Consultants spend less time preparing initial demo material — AI handles the first-pass generation of comments, demo scripts, and Master Data structures |
| **Consistency** | All outputs follow a structured, repeatable workflow; reduces inter-consultant variation |
| **Control** | Every AI output is reviewable before use; consultants approve, edit, or reject — nothing is exported without explicit human sign-off |

The sample customer workbook used in development contains 178 requirements across 15 columns — representative of a real Critical Manufacturing pre-sales engagement.

---

## Partner Validation

### April 2026 — Scope Confirmation (Teams + WhatsApp)

Rui Barbosa confirmed the product scope via Teams and WhatsApp:
- Phase 1: generate demo scripts from customer requirements Excel files
- Phase 2: generate Master Data objects for applicable requirements, importable into MES
- Provided: MES test environment, MCP Server, AWS Bedrock API key

Key guidance from Rui (April 2026 session):
- Phase 1 output should not hallucinate certainty — use workaround-first approach, then flag for review
- Phase 2 can be simplified; use requirements that clearly map to MES objects
- First object-type scope: Enterprise → Site → Facility → Area → Resource (Material and Product as stretch)
- Missing required fields should use safe defaults to keep the package importable
- The minimum useful Phase 2 output is something directly importable in MES

### June 2026 — Final Partner Validation

One formal meeting was held with Rui Barbosa at the end of the BML phase.

**Outcome:** Rui was very positive about the result. The team exceeded expectations — he said the team "surpreendeu pela positiva" and that what Critical Manufacturing intended for the project was delivered in full. The product direction, the Phase 1 and Phase 2 flows, and the consultant-facing UX were all validated.

---

## Academic Advisor Review

A 45-minute meeting was held with the academic advisor to review the product and UX.

**Key feedback received:**

- UX is well-structured but some flows could be clearer for first-time users
- The application should expose usage metrics to help consultants understand its value
- Suggested metric categories: time indicators, requirement processing volume, and approval quality

**Changes implemented after the advisor meeting:**

- About tab in Settings now shows project-level usage stats (requirements processed, approved count, active projects)
- Generation status and approval progress visible throughout the workflow
- Phase 2 stat cards on the Export page show approved / flagged / pending / total breakdown

---

## Product Metrics

The following metrics are tracked and visible in the application:

| Metric | Where visible | Description |
|---|---|---|
| Requirements processed | Generate step, Review step | Number of requirements sent through AI generation |
| Approved count | Review step, Export step | Requirements or objects approved by the consultant |
| Pending / flagged count | Review step | Requirements still awaiting review decision |
| Average confidence level | Review step | AI confidence distribution across generated outputs |
| Objects by type | Phase 2 Export | Breakdown of generated Master Data objects per MES type |
| Traceability links | Phase 2 Export, Traceability | Total requirement-to-object-to-field links in the package |
| Source requirements | Phase 2 Export | Requirements included in the Master Data package |
| Active projects | Settings → About | Total projects in the consultant's workspace |

---

## Technical Findings

### Real-Mode Bedrock Integration

The AWS Bedrock integration was implemented and tested in April 2026. Both credential paths were implemented (standard AWS SigV4 and bearer-token auth). The blocker went through two distinct phases:

1. **Budget exhaustion (April 2026)** — the partner's API key had a 75 USD budget that was exhausted before the team had made any successful calls. Rui Barbosa resolved this on the partner side; both the direct app flow and LibreChat were confirmed working briefly after the fix.
2. **IAM permission error (June 2026)** — the `bedrock:CallWithBearerToken` permission is explicitly denied for key `BedrockAPIKey-ww58`. MCP/RAG side works correctly. Fix request sent to Rui Barbosa on 05 Jun 2026, pending response.

**Impact:** Real-mode generation could not be fully validated end-to-end. Mock mode is the tested and deployed default.

**Reference:** `docs/discovery/phase-1-real-mode-validation-2026-04-20.md`

### Phase 2 MES Import Validation

The Phase 2 export package (Excel workbook + JSON manifest) was designed following the `MasterData_CookieFactory.zip` reference provided by the partner. Required fields use safe template-backed defaults where the requirement data does not specify a value. The package has not been validated by a live MES import.

DEE file generation is explicitly out of scope — confirmed by Rui Barbosa (April 2026): "the end goal is to generate the DEE files too, but that might be beyond the scope of what can be achieved in this project."

**Impact:** Phase 2 is described as a pilot demo artifact throughout the application.

### UI Revamp — Design System

A full visual redesign was implemented in May–June 2026 based on mockups produced by the Multimedia Masters (MM) program. The revamp covered all Phase 1, Phase 2, and Settings surfaces.

Key outcomes:
- Consistent visual language across 5+ engineers working in parallel on different surfaces
- Shared design token system eliminated visual drift
- Mobile responsiveness verified across all surfaces
- Storybook documents shared component primitives

---

## Development Activity

| Metric | Value |
|---|---|
| Total merged pull requests | 92+ |
| GitHub issues closed | 26 |
| GitHub issues open (remaining work) | 10 |
| Test files | 67 (Vitest) + Playwright e2e suite |
| Tests passing | 418 (Vitest) |
| Engineers | 5 |
| BML duration | ~10 weeks (April–June 2026) |

---

## Lessons Learned

- **Mock-first development pays off early.** Having a working mock mode from the start allowed the team to develop and test without depending on partner credential access.
- **Design handoff benefits from target screenshots.** The MM mockups provided clear per-surface targets that reduced ambiguity and made implementation reviews faster.
- **Real-mode credential dependencies are a risk.** Partner infrastructure issues (Bedrock 403) blocked live validation for weeks. Future projects should plan for a credential-availability buffer.
- **Phase 2 simplified scope was the right call.** Starting with a small, importable Master Data subset rather than the full CookieFactory scale let the team deliver a working demo path within the BML timeline.
- **Workflow gates improve consultant trust.** Requiring explicit approval before export — and making it impossible to skip review steps — was well-received in both the advisor meeting and the partner validation.
- **Tech stack pivot paid off.** LibreChat + MCP was the original plan from the KOM (March 6). The team pivoted to a custom Next.js application, which gave full control over the consultant-facing UX and the approval workflow — something LibreChat's chat interface could not have provided.
