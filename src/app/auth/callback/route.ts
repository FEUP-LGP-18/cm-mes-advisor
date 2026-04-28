import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const rawNext = url.searchParams.get("next") ?? "/";
  // Restrict to same-origin relative paths to prevent open redirect.
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "auth-not-configured");
    return NextResponse.redirect(loginUrl);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  // Exchange failed or no code present — send back to login with an error hint.
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("error", "auth-callback-failed");
  return NextResponse.redirect(loginUrl);
}
