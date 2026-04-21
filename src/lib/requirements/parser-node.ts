import { readFile } from "node:fs/promises";
import { parseRequirementsWorkbook } from "./parser";
import type { ParsedRequirement } from "./types";
import { assertRequirementsWorkbookFilename } from "./workbook-file";

export async function parseRequirementsWorkbookFile(
  filePath: string,
): Promise<ParsedRequirement[]> {
  assertRequirementsWorkbookFilename(filePath);

  const buffer = await readFile(filePath);
  return parseRequirementsWorkbook(buffer);
}
