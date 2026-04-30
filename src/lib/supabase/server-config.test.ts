import { afterEach, describe, expect, it, vi } from "vitest";
import {
  readSupabaseServerConfig,
  readSupabaseServerConfigStatus,
  requireSupabaseServerConfig,
  requireSupabaseServiceRoleConfig,
} from "./server-config";

describe("Supabase server config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reports missing public config without throwing", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");

    expect(readSupabaseServerConfig()).toBeNull();
    expect(readSupabaseServerConfigStatus()).toEqual({
      configured: false,
      config: null,
      missing: [
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      ],
    });
  });

  it("returns public config and optional service-role config when present", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service_role_test");

    expect(requireSupabaseServerConfig("Repository test")).toEqual({
      publishableKey: "sb_publishable_test",
      serviceRoleKey: "service_role_test",
      url: "https://example.supabase.co",
    });
  });

  it("throws an actionable error when required public config is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");

    expect(() => requireSupabaseServerConfig("Repository test")).toThrow(
      /Repository test requires Supabase configuration\. Missing: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/,
    );
  });

  it("requires the service-role key only for explicit admin operations", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    expect(() =>
      requireSupabaseServiceRoleConfig("Admin repository test"),
    ).toThrow(/Admin repository test requires SUPABASE_SERVICE_ROLE_KEY/);
  });
});
