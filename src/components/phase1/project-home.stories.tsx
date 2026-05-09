import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProjectCommandDesk } from "./project-home";
import type { ProjectListItem } from "@/lib/projects/types";

const activeProject: ProjectListItem = {
  archivedAt: null,
  createdAt: "2026-05-01T10:00:00.000Z",
  createdBy: "11111111-1111-4111-8111-111111111111",
  currentUserRole: "owner",
  customerName: "Customer X",
  description: "Phase 1 demo preparation workspace",
  id: "22222222-2222-4222-8222-222222222222",
  name: "Customer X MES demo",
  status: "active",
  updatedAt: "2026-05-09T10:00:00.000Z",
  updatedBy: "11111111-1111-4111-8111-111111111111",
};
const createProject = async () => ({
  message: null,
  status: "idle" as const,
});

const meta = {
  title: "Phase 1/Project Home",
  component: ProjectCommandDesk,
  tags: ["autodocs"],
  args: {
    currentUser: {
      email: "consultant@example.com",
      emailConfirmedAt: "2026-05-01T10:00:00.000Z",
      id: "11111111-1111-4111-8111-111111111111",
    },
    createProject,
    initialCreateProjectState: {
      message: null,
      status: "idle",
    },
    listError: null,
    onOpenProject: () => undefined,
    onQueryChange: () => undefined,
    onSortChange: () => undefined,
    query: "",
    sort: "recent",
    totalProjectCount: 1,
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
