export const AUTH_NOT_CONFIGURED_MESSAGE =
  "Authentication is not configured for this environment. Continue in local mock mode or add the Supabase environment variables to enable sign-in.";

export function sanitizeAuthNextPath(rawNext: string | null | undefined) {
  if (!rawNext) {
    return "/";
  }

  return rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";
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
  if (lower.includes("too many requests")) {
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
  if (lower.includes("too many requests")) {
    return "Too many attempts. Wait a moment and try again.";
  }
  return "Could not create account. Check your details and try again.";
}
