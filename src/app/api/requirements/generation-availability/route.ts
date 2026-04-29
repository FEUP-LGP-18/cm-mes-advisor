import { NextResponse } from "next/server";
import type { RequirementGenerationAvailabilityBody } from "../../../../lib/requirements/generation-api";
import { getRequirementGenerationAvailabilitySnapshot } from "../../../../lib/requirements/server/availability";
import { isSupabaseConfigured } from "../../../../lib/supabase/config";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (isSupabaseConfigured()) {
    const { createClient } = await import("../../../../lib/supabase/server");
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

  const url = new URL(request.url);
  const refresh = url.searchParams.get("refresh") === "1";

  const body: RequirementGenerationAvailabilityBody =
    await getRequirementGenerationAvailabilitySnapshot({
      refresh,
    });

  return NextResponse.json(body);
}
