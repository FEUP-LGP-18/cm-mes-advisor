import { NextResponse } from "next/server";
import type { RequirementGenerationAvailabilityBody } from "../../../../lib/requirements/generation-api";
import { getRequirementGenerationAvailabilitySnapshot } from "../../../../lib/requirements/server/availability";
import { requireUser } from "../../../../lib/projects/permissions.server";
import { isSupabaseConfigured } from "../../../../lib/supabase/config";

export const dynamic = "force-dynamic";

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

  const url = new URL(request.url);
  const refresh = url.searchParams.get("refresh") === "1";

  const body: RequirementGenerationAvailabilityBody =
    await getRequirementGenerationAvailabilitySnapshot({
      refresh,
    });

  return NextResponse.json(body);
}
