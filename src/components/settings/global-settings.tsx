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
    <div className="fv-settings-stack">
      <div>
        <nav className="fv-breadcrumb" aria-label="Breadcrumb">
          <Link href="/" className="fv-breadcrumb-link">Projects</Link>
          <span className="fv-breadcrumb-sep">/</span>
          <span>Settings</span>
        </nav>
        <h1 className="fv-page-title" style={{ marginTop: "0.5rem" }}>Workspace settings</h1>
        <p className="fv-page-subtitle">
          Confirm auth, generation, and release readiness without exposing environment variable values.
        </p>
      </div>

      <div className="fv-card">
        <div className="fv-card-title">Environment status</div>
        <p style={{ fontSize: "0.8rem", color: "var(--muted-fg)", marginBottom: "1rem", marginTop: "-0.25rem" }}>
          These indicators show whether required capabilities are configured. Secret values are intentionally hidden.
        </p>
        <div className="fv-settings-status-grid">
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
      </div>

      <div className="fv-card">
        <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted-fg)", marginBottom: "0.25rem" }}>
              Release readiness
            </div>
            <div className="fv-card-title" style={{ marginBottom: "0.25rem" }}>Pilot checklist</div>
            <p style={{ fontSize: "0.8rem", color: "var(--muted-fg)", margin: 0 }}>
              Use the checklist before calling a build complete. Phase 1 is complete on its own; Phase 2 is an optional continuation for Master Data validation.
            </p>
          </div>
          <Link href="/docs/release-checklist" className="fv-btn-secondary" style={{ flexShrink: 0 }}>
            Open checklist
          </Link>
        </div>
      </div>
    </div>
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
  return (
    <div className={`fv-status-tile fv-status-tile-${tone}`}>
      <div className="fv-status-tile-label">
        {label}
      </div>
      <div className="fv-status-tile-value">
        {value}
      </div>
      <p className="fv-status-tile-detail">
        {detail}
      </p>
    </div>
  );
}
