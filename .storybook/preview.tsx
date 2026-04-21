import type { Preview } from "@storybook/nextjs-vite";
import "../src/app/globals.css";

const preview: Preview = {
  parameters: {
    layout: "fullscreen",
    controls: {
      expanded: true,
    },
    options: {
      storySort: {
        order: ["Phase 1"],
      },
    },
    a11y: {
      test: "todo",
    },
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-[color:var(--background)] text-[color:var(--foreground)]">
        <Story />
      </div>
    ),
  ],
};

export default preview;
