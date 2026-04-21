import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import GenerateStudio from "./generate-studio";
import {
  createPhase1UiFixtureDemoRequirements,
  createPhase1UiFixtureReviewRequirements,
  phase1UiFixtureBlockedRealAvailability,
} from "@/lib/phase1/ui-fixtures";
import { mockGenerationStageLabels } from "@/lib/requirements/generation";

const requirements = createPhase1UiFixtureReviewRequirements();
const demoRequirements = createPhase1UiFixtureDemoRequirements();

const meta = {
  title: "Phase 1/Generate Studio",
  component: GenerateStudio,
  tags: ["autodocs"],
  args: {
    demoRequirements,
    generatedCount: 1,
    generationFeedback: {
      tone: "success",
      message: "Prototype draft generation completed for the recommended slice.",
    },
    initialGenerationAvailability: phase1UiFixtureBlockedRealAvailability,
    isGenerating: false,
    lastGenerationMode: "real",
    mockGenerationRun: {
      generatedCount: 1,
      selectedCount: 1,
      stages: mockGenerationStageLabels.map((label) => ({
        label,
        status: "complete" as const,
      })),
    },
    onGenerateRows: async () => true,
    onOpenReview: () => undefined,
    requirements,
  },
} satisfies Meta<typeof GenerateStudio>;

export default meta;

type Story = StoryObj<typeof meta>;

export const RecommendedDraft: Story = {};
