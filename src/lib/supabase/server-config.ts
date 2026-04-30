type SupabaseServerConfig = {
  publishableKey: string;
  serviceRoleKey: string | null;
  url: string;
};

type SupabaseServerConfigStatus =
  | {
      configured: true;
      config: SupabaseServerConfig;
      missing: [];
    }
  | {
      configured: false;
      config: null;
      missing: SupabaseServerConfigVariable[];
    };

type SupabaseServerConfigVariable =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY";

const REQUIRED_SERVER_CONFIG: SupabaseServerConfigVariable[] = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
];

export function readSupabaseServerConfigStatus(): SupabaseServerConfigStatus {
  const missing = REQUIRED_SERVER_CONFIG.filter(
    (name) => !process.env[name]?.trim(),
  );

  if (missing.length > 0) {
    return {
      configured: false,
      config: null,
      missing,
    };
  }

  return {
    configured: true,
    config: {
      publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    },
    missing: [],
  };
}

export function readSupabaseServerConfig() {
  const status = readSupabaseServerConfigStatus();
  return status.config;
}

export function requireSupabaseServerConfig(
  context = "Supabase server access",
) {
  const status = readSupabaseServerConfigStatus();

  if (!status.configured) {
    throw new Error(buildMissingSupabaseConfigMessage(context, status.missing));
  }

  return status.config;
}

export function requireSupabaseServiceRoleConfig(
  context = "Supabase service-role access",
) {
  const config = requireSupabaseServerConfig(context);

  if (!config.serviceRoleKey) {
    throw new Error(
      `${context} requires SUPABASE_SERVICE_ROLE_KEY. Add it to your local .env only when a server-only admin operation explicitly needs it. Do not expose this value to client components or NEXT_PUBLIC_* variables.`,
    );
  }

  return {
    ...config,
    serviceRoleKey: config.serviceRoleKey,
  };
}

function buildMissingSupabaseConfigMessage(
  context: string,
  missing: SupabaseServerConfigVariable[],
) {
  return `${context} requires Supabase configuration. Missing: ${missing.join(", ")}. Add safe values to .env.local or .env using the placeholders in .env.example. Leave these variables unset only for local mock-only mode where auth is intentionally disabled.`;
}
