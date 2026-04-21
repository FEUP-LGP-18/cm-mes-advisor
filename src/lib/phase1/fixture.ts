import path from "node:path";
import { parseRequirementsWorkbookFile } from "@/lib/requirements/parser-node";
import type { ReviewProjectMetadata } from "@/lib/requirements/review";
import { createFixtureSourceMetadata } from "@/lib/requirements/source";
import {
  createFixtureWorkspaceState,
  type RequirementsWorkspaceState,
} from "@/lib/requirements/workspace-state";

const fixturePath = "fixtures/customer-x-functional-requirements.xlsx";

export async function getFixtureWorkspaceState(): Promise<{
  fixturePath: string;
  workspaceState: RequirementsWorkspaceState;
}> {
  const parsedRequirements = await parseRequirementsWorkbookFile(
    path.join(process.cwd(), fixturePath),
  );
  const project: ReviewProjectMetadata = {
    projectId: "customer-x-fixture",
    projectName: "Customer X Demo",
    customerName: "Customer X",
    sourceFilename: fixturePath,
    sourceRowCount: parsedRequirements.length,
  };
  const source = createFixtureSourceMetadata(project);

  return {
    fixturePath,
    workspaceState: createFixtureWorkspaceState(source, parsedRequirements),
  };
}
