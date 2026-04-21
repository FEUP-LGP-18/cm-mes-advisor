import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProjectCommandDesk } from "./project-home";
import { createPhase1UiFixtureProjectRecord } from "@/lib/phase1/ui-fixtures";

const activeProject = createPhase1UiFixtureProjectRecord({
  currentStep: "review",
  statusesByRequirementId: {
    "01.01": "pending",
    "01.02": "approved",
  },
});

const meta = {
  title: "Phase 1/Project Home",
  component: ProjectCommandDesk,
  tags: ["autodocs"],
  args: {
    onCreateSampleProject: () => undefined,
    onOpenProject: () => undefined,
    onQueryChange: () => undefined,
    onSortChange: () => undefined,
    query: "",
    sort: "recent",
  },
} satisfies Meta<typeof ProjectCommandDesk>;

export default meta;

type Story = StoryObj<typeof meta>;

export const EmptyState: Story = {
  args: {
    activeProject: null,
    projects: [],
  },
};

export const ActiveQueue: Story = {
  args: {
    activeProject,
    projects: [activeProject],
  },
};
