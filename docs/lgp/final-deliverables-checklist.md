# Final Deliverables Checklist

Last updated: 2026-06-15

This checklist is for LGP closure coordination. It records what the team should prepare and where it is expected to go, while leaving Moodle/FAQ-specific details for final human confirmation.

## Team Deliverables To Submit

| Deliverable | Purpose | Expected location |
|---|---|---|
| Final Strategic Plan | Final product, market, value, and strategy narrative | Moodle final deliverable area; confirm exact activity name in Moodle/FAQ |
| Final Management Report | Project execution, planning, effort, quality, and retrospective evidence | Moodle final deliverable area; confirm exact activity name in Moodle/FAQ |
| Final presentation / closure deck | Final event and closure communication | Moodle or Teams/Drive, depending on course instructions |
| Repository link | Source code and documentation handover | GitHub deliverable issue and final shared link bundle |
| Deployed application link | Pilot-ready app access for reviewers | GitHub deliverable issue and final shared link bundle |
| Handover documentation | Critical Manufacturing takeover notes | Repository under `docs/lgp/` and final shared link bundle |
| User manual | Consultant-facing usage guide | Repository under `docs/lgp/` and final shared link bundle |
| Findings and metrics | Build-measure-learn findings, validation, and limitations | Repository under `docs/lgp/` and final shared link bundle |

## Submission Reminders

- **GitHub deliverable issue:** keep the required final deliverable issue or issues updated with the repository link, deployed app link, and final documentation pointers. Do not create or close issues from this checklist without team confirmation.
- **Teams/Drive final link:** add the final shared folder or link bundle after the team confirms the correct Teams/Drive location and access permissions.
- **Moodle upload:** upload only the required final PDFs/files after confirming the exact Moodle activity names, file naming rules, and deadline.
- **Self-assessment:** every team member should complete the required individual self-assessment form or Moodle activity.
- **Retrospective essay:** every team member should submit the individual retrospective essay if required by the course FAQ.
- **CSTA / retrospective meeting:** confirm whether a CSTA, retrospective, or closure meeting is required, who attends, and whether evidence must be uploaded afterward.

## Items Requiring Moodle / FAQ Confirmation

- Exact final deliverable activity names in Moodle.
- Whether final documents must be PDF only, editable source files, or both.
- Required naming convention for uploaded files.
- Whether the GitHub deliverable issue must contain all final links or only repository/deployment links.
- Whether Teams/Drive links must be submitted in Moodle, GitHub, or both.
- Individual self-assessment deadline and submission location.
- Individual retrospective essay format, deadline, and submission location.
- CSTA/retrospective meeting date, attendees, evidence requirements, and follow-up upload location.
- Any partner-specific final validation evidence required for the Phase 2 Master Data package, especially MES import validation.

## Current Product Reality To Preserve In Deliverables

- Phase 1 is the main MVP workflow: source → generate → review → script → export.
- Phase 2 is an optional pilot continuation after approved Phase 1 rows: setup → process → review → export → traceability.
- Phase 2 produces a pilot Master Data package and is not production/MES-import validated until Critical Manufacturing validates the import.
- Mock mode is the safe default.
- Real AI generation supports server-side Bedrock and Anthropic provider paths with MCP/RAG documentation grounding.
- Credentials stay server-side only. Do not paste API keys, tokens, passwords, or partner secrets into deliverables.
- Anthropic was added as the practical fallback after Bedrock key, budget, and IAM issues.
