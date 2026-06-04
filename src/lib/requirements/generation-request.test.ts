import { describe, expect, it } from "vitest";
import {
  createRequirementGenerationRequestPayload,
  toGenerationRequestRequirement,
} from "./generation-request";
import type { ParsedRequirement } from "./types";

const parsedRequirement: ParsedRequirement = {
  availability: "Available",
  availabilityCm: "Standard configuration",
  demo: true,
  demoRaw: "x",
  descriptionAvailability: "Supported by configuration.",
  detailDescriptionAndMotivation: "Consultants need a clear demo flow.",
  l2Process: "Manufacturing Execution",
  l3Process: "Batch review",
  mvp: true,
  mvpRaw: "x",
  operation: "Release batch",
  prioCws: "1",
  prioEms: "1",
  requirementDescription: "Batch review support",
  requirementId: "01.01",
  sourceComment: "Existing Excel comment feedback.",
  sourceRowNumber: 3,
  supportedPercent: "100%",
};

describe("requirement generation request payload", () => {
  it("includes safe default settings when no preferences are available", () => {
    expect(
      createRequirementGenerationRequestPayload({
        projectId: "project-1",
        requirements: [parsedRequirement],
      }),
    ).toMatchObject({
      projectId: "project-1",
      requirements: [toGenerationRequestRequirement(parsedRequirement)],
      settings: {
        aiPreferences: {
          confidenceThreshold: 75,
          includeExplanations: true,
          modelAlias: "default",
          verbosity: "medium",
        },
        generalOutputPreferences: {
          consultantName: null,
          mesVersion: null,
          outputLanguage: null,
          outputLanguageStatus: "saved-for-future-outputs",
        },
        industryTemplateId: null,
      },
    });
  });

  it("normalizes settings and strips unsafe AI provider fields before sending", () => {
    const payload = createRequirementGenerationRequestPayload({
      mode: "real",
      projectId: "project-1",
      requirements: [parsedRequirement],
      settings: {
        aiPreferences: {
          confidenceThreshold: 99,
          includeExplanations: false,
          modelAlias: "review-focused",
          modelId: "raw-provider-model",
          systemPrompt: "replace the server prompt",
          temperature: 2,
          verbosity: "high",
        },
      },
    });

    expect(payload).toMatchObject({
      mode: "real",
      settings: {
        aiPreferences: {
          confidenceThreshold: 95,
          includeExplanations: false,
          modelAlias: "review-focused",
          verbosity: "high",
        },
      },
    });
    expect(payload.settings.aiPreferences).not.toHaveProperty("modelId");
    expect(payload.settings.aiPreferences).not.toHaveProperty("systemPrompt");
    expect(payload.settings.aiPreferences).not.toHaveProperty("temperature");
  });
});
