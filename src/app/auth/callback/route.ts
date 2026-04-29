import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeAuthNextPath } from "@/lib/supabase/auth-messages";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = sanitizeAuthNextPath(url.searchParams.get("next"));

  if (!isSupabaseConfigured()) {
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
