import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { RootProvider } from "fumadocs-ui/provider/next";
import { baseOptions } from "@/lib/docs/layout";
import { source } from "@/lib/docs/source";

export default function DocumentationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RootProvider
      theme={{
        defaultTheme: "dark",
        enableSystem: false,
        storageKey: "cm-mes-advisor:docs-theme",
      }}
    >
      <DocsLayout tree={source.pageTree} {...baseOptions()}>
        {children}
      </DocsLayout>
    </RootProvider>
  );
}
