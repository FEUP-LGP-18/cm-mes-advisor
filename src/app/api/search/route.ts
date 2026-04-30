import { createFromSource } from "fumadocs-core/search/server";
import { NextResponse } from "next/server";
import { source } from "@/lib/docs/source";
import { requireUser } from "@/lib/projects/permissions.server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const { GET: searchDocs } = createFromSource(source, {
  language: "english",
});

export async function GET(request: Request) {
  if (isSupabaseConfigured()) {
    const userResult = await requireUser();
    if (!userResult.ok) {
      return NextResponse.json(
        { ok: false, error: userResult.message },
        { status: 401 },
      );
    }
  }

  return searchDocs(request);
}
