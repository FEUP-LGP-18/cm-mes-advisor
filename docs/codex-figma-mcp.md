# Codex + Figma MCP Setup

This repo is ready for Figma-informed implementation, but Figma authentication and plugin connection still require manual user action.

## Implemented In Repo

- Repo skill: `$figma-implementation-rules`
- Repo UI guidance in [`AGENTS.md`](../AGENTS.md)
- Shared tokens and surface rules in [`docs/design/phase1-design-system-guidelines.md`](./design/phase1-design-system-guidelines.md)
- Shared component and fixture layer for consultant-facing Phase 1 surfaces

## Recommended Connection Path

The recommended Figma MCP endpoint is:

```text
https://mcp.figma.com/mcp
```

Per current official docs, the remote Figma MCP server is the recommended option and Codex supports it, but authentication must still happen through Figma’s OAuth flow.

## Codex App Setup

1. Open the Codex app.
2. Open `Plugins` in the upper-left corner.
3. Find `Figma` and click `+`.
4. Click `Install Figma`.
5. Complete the authentication flow and click `Allow access`.
6. Restart the thread if the new tools or skills do not appear immediately.

## Codex CLI Setup

Run:

```bash
codex mcp add figma --url https://mcp.figma.com/mcp
```

Then authenticate when Codex prompts you.

Verify the connection with:

```bash
codex mcp list
```

If the server is connected, you should see a `figma` MCP entry.

## Optional User Config

If you want the Figma MCP server available across repos, put it in your user config:

```toml
[mcp_servers.figma]
url = "https://mcp.figma.com/mcp"
bearer_token_env_var = "FIGMA_OAUTH_TOKEN"
```

User config path:

```text
~/.codex/config.toml
```

Repo config path:

```text
/Users/mahmoudali/Documents/LGP project dicovery/cm-mes-advisor/.codex/config.toml
```

Do not commit personal Figma tokens to this repo.

## What To Send Codex

For the best implementation quality, provide:

- the exact Figma file URL or selection URL
- the target frame or node
- a screenshot when visual nuance matters
- any breakpoint, mode, or variant notes

Good prompt:

```text
Use $figma-implementation-rules and implement the Phase 1 review workspace from this exact Figma frame: <figma-link>. Start by extracting the design context and screenshot, then adapt it to this repo’s existing tokens and shared Phase 1 surface patterns.
```

## Repo Rules For Figma Work

- Start from exact design context, not guesses.
- Pull a screenshot or design context before coding when the layout is detailed.
- Reuse repo tokens, spacing, typography, and shell patterns before introducing new values.
- Translate Figma output into repo conventions instead of copying raw generated code blindly.
- Document any mismatch between the design and the repo’s existing product rules.

## Write-To-Figma Notes

- Codex supports Figma write-to-canvas workflows through Figma’s `use_figma` tooling.
- Per current Figma docs, write access requires a Full seat and edit permission on the file.
- Dev seats can still use read-only flows such as extracting variables, screenshots, and component context.
- Figma’s remote MCP flow is link-based, so always include the exact file or selection URL.

## Code Connect Later

If the team adopts Code Connect later:

- keep this repo’s tokens and components as the code source of truth
- map Figma components to existing repo components instead of generating parallel markup
- add Code Connect mappings only for stable, reusable components

## Manual Steps That Cannot Be Faked

- Figma OAuth login
- approving Codex access to your Figma account
- any seat, permission, or plan upgrades inside Figma

Reference docs used for this file:

- [OpenAI Codex MCP docs](https://developers.openai.com/codex/mcp)
- [Figma remote MCP setup](https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/)
- [Figma write to canvas](https://developers.figma.com/docs/figma-mcp-server/write-to-canvas/)
- [Figma plans and permissions](https://developers.figma.com/docs/figma-mcp-server/plans-access-and-permissions/)
