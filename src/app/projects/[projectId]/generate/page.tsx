import { getRequirementGenerationAvailabilitySnapshot } from "@/lib/requirements/server/availability";
import Phase1ProjectStepRoute from "@/components/phase1/step-route";

export const dynamic = "force-dynamic";

export default async function ProjectGeneratePage() {
  const generationAvailability =
    await getRequirementGenerationAvailabilitySnapshot();

  return (
    <Phase1ProjectStepRoute
      step="generate"
      initialGenerationAvailability={generationAvailability}
    />
  );
}
