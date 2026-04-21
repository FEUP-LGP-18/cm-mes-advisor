import { NextResponse } from "next/server";
import type { RequirementGenerationAvailabilityBody } from "../../../../lib/requirements/generation-api";
import { getRequirementGenerationAvailabilitySnapshot } from "../../../../lib/requirements/server/availability";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const refresh = url.searchParams.get("refresh") === "1";

  const body: RequirementGenerationAvailabilityBody =
    await getRequirementGenerationAvailabilitySnapshot({
      refresh,
    });

  return NextResponse.json(body);
}
