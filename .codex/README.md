# Repo Codex Configuration

This directory only stores repo-safe Codex configuration.

- Committed here:
  - `.codex/config.toml`
- Not committed here:
  - secrets
  - auth tokens
  - guessed local-environment schemas

Codex app local environments are configured through the app settings UI and stored under `.codex/` when the app generates them. This repo does not hand-author those files because the current public docs describe where the files live, but not a stable schema to write manually.

Use `/Users/mahmoudali/Documents/LGP project dicovery/cm-mes-advisor/docs/codex-frontend-setup-macos.md` for the exact app-side setup steps.
