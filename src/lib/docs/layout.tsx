import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: "CM MES Advisor Docs",
      url: "/docs",
    },
    links: [
      {
        type: "main",
        text: "Product app",
        url: "/",
        active: "none",
      },
    ],
    searchToggle: {
      enabled: true,
    },
    themeSwitch: {
      enabled: true,
    },
  };
}
