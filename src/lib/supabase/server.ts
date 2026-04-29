import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { requireSupabasePublicConfig } from "./config";

export async function createClient(response?: NextResponse) {
  const cookieStore = await cookies();
  const { publishableKey, url } = requireSupabasePublicConfig();

  return createServerClient(
    url,
    publishableKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response?.cookies.set(name, value, options);
            try {
              cookieStore.set(name, value, options);
            } catch {
              // Called from a Server Component; middleware handles session refresh.
            }
          });
        },
      },
    },
  );
}
