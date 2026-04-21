import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import ReviewStudio from "./review-studio";
import {
  createPhase1UiFixtureReviewQueue,
  createPhase1UiFixtureReviewRequirements,
  phase1UiFixtureProjectMetadata,
} from "@/lib/phase1/ui-fixtures";

const reviewRequirements = createPhase1UiFixtureReviewRequirements({
  "01.01": "pending",
  "01.02": "pending",
});
const reviewQueue = createPhase1UiFixtureReviewQueue({
  "01.01": "pending",
  "01.02": "pending",
});

const meta = {
  title: "Phase 1/Review Studio",
  component: ReviewStudio,
  tags: ["autodocs"],
  args: {
    approvedCount: 0,
    generatedCount: reviewQueue.length,
    generatedReviewableRequirements: reviewQueue,
    onGenerateDemoRows: async () => false,
    onGoToGenerate: () => undefined,
    onOpenScript: () => undefined,
    onReviewAction: () => undefined,
    projectId: phase1UiFixtureProjectMetadata.projectId,
    reviewRequirements,
  },
} satisfies Meta<typeof ReviewStudio>;

export default meta;

type Story = StoryObj<typeof meta>;

export const QueueDetail: Story = {};
