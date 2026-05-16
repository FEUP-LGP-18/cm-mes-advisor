import Link from "next/link";

export function GlobalSettingsView({
  currentUserEmail,
  generationMode,
  realGenerationConfigured,
  supabaseConfigured,
  supabaseMissing,
}: {
  currentUserEmail: string | null;
  generationMode: "mock" | "real";
  realGenerationConfigured: boolean;
  supabaseConfigured: boolean;
  supabaseMissing: string[];
}) {
  return (
    <section className="mx-auto grid w-full max-w-[1120px] gap-6 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
      <header className="phase-shell-header">
        <div className="phase-shell-header-top w-full">
          <div className="phase-shell-breadcrumbs">
            <Link href="/" className="phase-product-link">
              Projects
            </Link>
            <span className="phase-shell-divider">/</span>
            <span>Settings</span>
          </div>
          <div className="phase-shell-pill-row ml-auto">
            <span className="phase-shell-pill">Workspace</span>
            <span className="phase-shell-pill phase-shell-pill-muted">
              Safe status
            </span>
          </div>
        </div>
        <div className="phase-shell-header-main">
          <div className="phase-shell-title-block">
            <h1 className="phase-shell-title">Workspace settings</h1>
            <p className="phase-shell-helper">
              Confirm auth, generation, and release readiness without exposing
              environment variable values.
            </p>
          </div>
        </div>
      </header>

      <section className="phase-section-card">
        <div className="phase-section-copy">
          <h2 className="phase-section-title">Environment status</h2>
          <p className="phase-section-body">
            These indicators show whether required capabilities are configured.
            Secret values are intentionally hidden.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <StatusTile
            label="Supabase auth"
            value={supabaseConfigured ? "Configured" : "Not configured"}
            tone={supabaseConfigured ? "positive" : "warning"}
            detail={
              supabaseConfigured
                ? "Authenticated projects, roles, profiles, and collaboration are available."
                : `Missing ${supabaseMissing.join(", ") || "public Supabase config"}. Local mock mode remains available.`
            }
          />
          <StatusTile
            label="Generation mode"
            value={generationMode}
            tone={generationMode === "mock" ? "positive" : "warning"}
            detail={
              generationMode === "mock"
                ? "Pilot demo builds stay usable without partner Bedrock credentials."
                : "Real mode is enabled server-side. Validate partner access before claiming end-to-end readiness."
            }
          />
          <StatusTile
            label="Real generation"
            value={realGenerationConfigured ? "Ready to test" : "Not ready"}
            tone={realGenerationConfigured ? "warning" : "default"}
            detail={
              realGenerationConfigured
                ? "Server config is present, but partner Bedrock and MES validation still need manual proof."
                : "Missing server-only MCP or Bedrock config. Mock mode is the supported pilot path."
            }
          />
          <StatusTile
            label="Current user"
            value={currentUserEmail ?? "Local mock mode"}
            tone="default"
            detail={
              currentUserEmail
                ? "This signed-in identity is used for project membership checks."
                : "No authenticated user is required while Supabase is disabled."
            }
          />
        </div>
      </section>

      <section className="phase-section-card">
        <div className="phase-toolbar">
          <div className="phase-toolbar-copy">
            <p className="phase-overline">Release readiness</p>
            <h2 className="phase-section-title">Pilot checklist</h2>
            <p className="phase-section-body">
              Use the checklist before calling a build complete. Phase 2 is a
              required demo flow, but MES import validation remains external.
            </p>
          </div>
          <Link
            href="/docs/release-checklist"
            className="focus-premium theme-shell-button-secondary rounded-2xl px-5 py-3 text-sm font-semibold transition"
          >
            Open checklist
          </Link>
        </div>
      </section>
    </section>
  );
}

function StatusTile({
  detail,
  label,
  tone,
  value,
}: {
  detail: string;
  label: string;
  tone: "default" | "positive" | "warning";
  value: string;
}) {
  const toneClass =
    tone === "positive"
      ? "tone-positive"
      : tone === "warning"
        ? "tone-warning"
        : "tone-neutral";

  return (
    <div className={`theme-shell-card rounded-2xl px-4 py-4 ${toneClass}`}>
      <p className="phase-overline">{label}</p>
      <strong className="mt-2 block text-lg">{value}</strong>
      <p className="mt-2 text-sm leading-6 text-[color:var(--shell-muted)]">
        {detail}
      </p>
    </div>
  );
}
