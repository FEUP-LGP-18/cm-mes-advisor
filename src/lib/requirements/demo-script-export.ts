import type {
  RequirementGenerationSourceReference,
  RequirementGenerationConfidence,
} from "./generation";
import type { DemoScriptAssembly } from "./demo-script";
import type { ReviewProjectMetadata } from "./review";

export interface DemoScriptMarkdownExportInput {
  assembly: DemoScriptAssembly;
  projectMetadata: ReviewProjectMetadata;
  exportTimestamp: string;
}

export function serializeDemoScriptToMarkdown({
  assembly,
  exportTimestamp,
  projectMetadata,
}: DemoScriptMarkdownExportInput): string {
  const lines: string[] = [];

  appendHeading(lines, 1, assembly.title);
  lines.push("");
  appendSectionHeading(lines, "Project Context");
  appendBullet(lines, "Project", projectMetadata.projectName);
  appendBullet(lines, "Customer", projectMetadata.customerName);
  appendBullet(lines, "Source file", projectMetadata.sourceFilename);
  appendBullet(lines, "Export timestamp", exportTimestamp);
  appendParagraph(
    lines,
    "Phase 1 scope note: this demo script was generated from Excel requirements and consultant review.",
  );
  lines.push("");
  appendSectionHeading(lines, "Summary");
  appendBullet(
    lines,
    "Generated drafts",
    String(assembly.generatedRequirementCount),
  );
  appendBullet(
    lines,
    "Approved requirements",
    String(assembly.approvedRequirementCount),
  );
  appendBullet(lines, "Demo steps", String(assembly.approvedStepCount));
  appendBullet(lines, "Sections", String(assembly.sections.length));

  for (const section of assembly.sections) {
    lines.push("");
    appendSectionHeading(lines, section.title);
    appendBullet(lines, "Grouping", section.sourceLabel);
    appendBullet(lines, "Section summary", section.subtitle);

    for (const step of section.steps) {
      lines.push("");
      appendHeading(lines, 3, step.title);
      appendBullet(lines, "Requirement ID", step.traceability.requirementId);
      appendBullet(
        lines,
        "Excel row",
        String(step.traceability.sourceRowNumber),
      );
      appendBullet(lines, "Current consultant comment", step.currentComment);
      appendBullet(lines, "Generated source comment", step.generatedComment);
      appendBullet(lines, "Confidence", formatConfidence(step.confidence));
      appendBullet(lines, "Confidence rationale", step.confidence.rationale);
      appendBullet(lines, "Traceability key", step.traceability.requirementKey);
      appendBullet(lines, "Source demo step", step.sourceDemoStep.id);

      if (step.note.trim().length > 0) {
        appendBullet(lines, "Local note", step.note);
      }

      if (step.instructions.length > 0) {
        lines.push("");
        appendHeading(lines, 4, "Demo instructions");
        step.instructions.forEach((instruction, index) => {
          lines.push(`${index + 1}. ${normalizeInlineText(instruction)}`);
        });
      }

      appendStringListSection(lines, "Assumptions", step.assumptions);
      appendStringListSection(lines, "Warnings", step.warnings);
      appendSourceReferences(lines, step.sourceReferences);
    }
  }

  lines.push("");
  appendSectionHeading(lines, "Phase 1 Notes");
  appendParagraph(
    lines,
    "Phase 2 Master Data is required for the pilot demo after this export. The generated package is not MES-validated until a partner manually imports and accepts it.",
  );

  return lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
}

export function createDemoScriptExportFilename(
  scriptTitle: string,
  projectName: string,
): string {
  const baseName =
    sanitizeFilenamePart(scriptTitle) ||
    sanitizeFilenamePart(projectName) ||
    "demo-script";
  const normalizedBaseName = baseName.endsWith("demo-script")
    ? baseName
    : `${baseName}-demo-script`;

  return `${normalizedBaseName}.md`;
}

function appendSectionHeading(lines: string[], title: string): void {
  appendHeading(lines, 2, title);
}

function appendHeading(
  lines: string[],
  level: 1 | 2 | 3 | 4,
  title: string,
): void {
  lines.push(`${"#".repeat(level)} ${normalizeInlineText(title)}`);
}

function appendBullet(lines: string[], label: string, value: string): void {
  const normalizedValue = normalizeInlineText(value);

  if (normalizedValue.length === 0) {
    return;
  }

  lines.push(`- ${label}: ${normalizedValue}`);
}

function appendParagraph(lines: string[], value: string): void {
  const normalizedValue = normalizeInlineText(value);

  if (normalizedValue.length === 0) {
    return;
  }

  lines.push(normalizedValue);
}

function appendStringListSection(
  lines: string[],
  label: string,
  items: string[],
): void {
  const normalizedItems = items
    .map((item) => normalizeInlineText(item))
    .filter((item) => item.length > 0);

  if (normalizedItems.length === 0) {
    return;
  }

  lines.push("");
  appendHeading(lines, 4, label);
  normalizedItems.forEach((item) => {
    lines.push(`- ${item}`);
  });
}

function appendSourceReferences(
  lines: string[],
  sourceReferences: RequirementGenerationSourceReference[],
): void {
  if (sourceReferences.length === 0) {
    return;
  }

  lines.push("");
  appendHeading(lines, 4, "Source references");
  sourceReferences.forEach((reference) => {
    const note = normalizeInlineText(reference.note);
    const label = reference.url
      ? `[${normalizeInlineText(reference.label)}](${reference.url})`
      : normalizeInlineText(reference.label);
    const suffix = note.length > 0 ? ` — ${note}` : "";
    lines.push(`- [${reference.kind}] ${label}${suffix}`);
  });
}

function formatConfidence(confidence: RequirementGenerationConfidence): string {
  return `${capitalize(confidence.level)} (${trimTrailingZeros(confidence.score)})`;
}

function capitalize(value: string): string {
  return value.length > 0
    ? `${value[0].toUpperCase()}${value.slice(1)}`
    : value;
}

function trimTrailingZeros(value: number): string {
  return value
    .toFixed(2)
    .replace(/\.00$/, "")
    .replace(/(\.\d*[1-9])0$/, "$1");
}

function normalizeInlineText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function sanitizeFilenamePart(value: string): string {
  return normalizeInlineText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
