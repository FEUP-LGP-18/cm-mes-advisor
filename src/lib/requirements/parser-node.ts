import { readFile } from "node:fs/promises";
import {
  assertRequirementsWorkbookFilename,
  parseRequirementsWorkbook,
  type ParsedRequirement,
} from "./parser";

export async function parseRequirementsWorkbookFile(
  filePath: string,
): Promise<ParsedRequirement[]> {
  assertRequirementsWorkbookFilename(filePath);

  const buffer = await readFile(filePath);
  return parseRequirementsWorkbook(buffer);
}
