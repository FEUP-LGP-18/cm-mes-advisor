import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GlobalSettingsView } from "./global-settings";

describe("GlobalSettingsView", () => {
  it("renders safe pilot environment status without exposing secret values", () => {
    const html = renderToStaticMarkup(
      <GlobalSettingsView
        currentUserEmail="owner@example.com"
        generationMode="mock"
        realGenerationConfigured={false}
        supabaseConfigured
        supabaseMissing={[]}
      />,
    );

    expect(html).toContain("Workspace settings");
    expect(html).toContain("Supabase auth");
    expect(html).toContain("Configured");
    expect(html).toContain("Generation mode");
    expect(html).toContain("mock");
    expect(html).toContain("Real generation");
    expect(html).toContain("Not ready");
    expect(html).not.toContain("sb_publishable");
    expect(html).not.toContain("AWS_SECRET_ACCESS_KEY");
    expect(html).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });
});
