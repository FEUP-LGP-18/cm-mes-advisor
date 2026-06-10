export const AUTH_NOT_CONFIGURED_MESSAGE =
  "Authentication is not configured for this environment. Continue in local mock mode or add the Supabase environment variables to enable sign-in.";

export function sanitizeAuthNextPath(rawNext: string | null | undefined) {
  if (!rawNext) {
    return "/";
  }

  return rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";
}

export function buildAuthCallbackUrl({
  currentOrigin,
  next,
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL,
}: {
  currentOrigin: string;
  next?: string | null;
  siteUrl?: string | null;
}) {
  const callbackUrl = new URL(
    "/auth/callback",
    readAuthRedirectBaseUrl(siteUrl, currentOrigin),
  );
  callbackUrl.searchParams.set("next", sanitizeAuthNextPath(next));

  return callbackUrl.toString();
}

export function buildPasswordResetRedirectUrl({
  currentOrigin,
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL,
}: {
  currentOrigin: string;
  siteUrl?: string | null;
}) {
  return buildAuthCallbackUrl({
    currentOrigin,
    next: "/reset-password",
    siteUrl,
  });
}

function readAuthRedirectBaseUrl(
  siteUrl: string | null | undefined,
  currentOrigin: string,
) {
  return (
    normalizeUrlOrigin(siteUrl) ??
    normalizeUrlOrigin(currentOrigin) ??
    currentOrigin
  );
}

function normalizeUrlOrigin(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return new URL(trimmed).origin;
  } catch {
    return null;
  }
}

export function getAuthRedirectErrorMessage(code: string | null) {
  switch (code) {
    case "auth-callback-failed":
      return "The sign-in link could not be verified. Request a new link or sign in with your email and password.";
    case "auth-not-configured":
      return AUTH_NOT_CONFIGURED_MESSAGE;
    default:
      return null;
  }
}

export function mapSignInError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("invalid login credentials") ||
    lower.includes("invalid email or password")
  ) {
    return "Invalid email or password. Please try again.";
  }
  if (lower.includes("email not confirmed")) {
    return "Check your email and confirm your account before signing in.";
  }
  if (lower.includes("too many requests") || lower.includes("rate limit")) {
    return "Too many sign-in attempts. Wait a moment and try again.";
  }
  return "Sign-in failed. Please check your details and try again.";
}

export function mapSignUpError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("already registered") ||
    lower.includes("user already exists")
  ) {
    return "An account with this email already exists. Sign in instead.";
  }
  if (lower.includes("invalid email")) {
    return "Enter a valid email address.";
  }
  if (lower.includes("password") && lower.includes("6")) {
    return "Password must be at least 6 characters.";
  }
  if (lower.includes("too many requests") || lower.includes("rate limit")) {
    return "Too many attempts. Wait a moment and try again.";
  }
  return "Could not create account. Check your details and try again.";
}

export function mapPasswordResetError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("too many requests") || lower.includes("rate limit")) {
    return "Too many reset emails. Wait a moment and try again.";
  }
  return "Could not send a reset link. Check the email address and try again.";
}
