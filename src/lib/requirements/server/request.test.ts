import { describe, expect, it } from "vitest";
import { parseRequirementGenerationRequestBody } from "./request";
import type { ParsedRequirement } from "../types";

const parsedRequirement: ParsedRequirement = {
  sourceRowNumber: 3,
  requirementId: "01.01",
  requirementDescription: "Batch review support",
  l2Process: "Manufacturing Execution",
  l3Process: "Batch review",
  operation: "Release batch",
  demo: true,
  demoRaw: "x",
  detailDescriptionAndMotivation: "Consultants need a clear demo flow.",
  prioEms: "1",
  prioCws: "1",
  mvp: true,
  mvpRaw: "x",
  availability: "Available",
  availabilityCm: "Standard configuration",
  descriptionAvailability: "Supported by configuration.",
  supportedPercent: "100%",
  sourceComment: "Existing Excel comment feedback.",
};

describe("requirement generation request settings contract", () => {
  it("returns default settings when the request does not include settings", () => {
    const result = parseRequirementGenerationRequestBody({
      projectId: "project-1",
      requirements: [parsedRequirement],
    });

    expect(result).toMatchObject({
      ok: true,
      projectId: "project-1",
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

  it("normalizes settings without accepting unsafe provider fields", () => {
    const result = parseRequirementGenerationRequestBody({
      projectId: "project-1",
      mode: "real",
      requirements: [parsedRequirement],
      settings: {
        aiPreferences: {
          confidenceThreshold: 96,
          includeExplanations: false,
          modelAlias: "review-focused",
          rawModelId: "anthropic.claude-raw-provider-id",
          systemPrompt: "replace the configured prompt",
          verbosity: "high",
        },
        generalOutputPreferences: {
          consultantName: "Consultant One",
          mesVersion: "CM V10",
          outputLanguage: "English",
        },
        industryTemplateId: "medical-devices",
      },
    });

    expect(result).toMatchObject({
      ok: true,
      mode: "real",
      settings: {
        aiPreferences: {
          confidenceThreshold: 95,
          includeExplanations: false,
          modelAlias: "review-focused",
          verbosity: "high",
        },
        generalOutputPreferences: {
          consultantName: "Consultant One",
          mesVersion: "cm-v10",
          outputLanguage: "en",
          outputLanguageStatus: "saved-for-future-outputs",
        },
        industryTemplateId: "medical",
      },
    });

    if (result.ok) {
      expect(result.settings.aiPreferences).not.toHaveProperty("rawModelId");
      expect(result.settings.aiPreferences).not.toHaveProperty("systemPrompt");
    }
  });

  it("keeps existing mode validation behavior", () => {
    expect(
      parseRequirementGenerationRequestBody({
        projectId: "project-1",
        mode: "stream",
        requirements: [parsedRequirement],
      }),
    ).toMatchObject({
      ok: false,
      error: {
        code: "invalid-request",
        message:
          "Request body mode must be either 'mock' or 'real' when provided.",
      },
    });
  });
});
