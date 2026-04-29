import { createFromSource } from "fumadocs-core/search/server";
import { NextResponse } from "next/server";
import { source } from "@/lib/docs/source";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const { GET: searchDocs } = createFromSource(source, {
  language: "english",
});

export async function GET(request: Request) {
  if (isSupabaseConfigured()) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Authentication required." },
        { status: 401 },
      );
    }
  }

  return searchDocs(request);
}
