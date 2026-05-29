import { describe, expect, it } from "vitest";
import { masterDataObjectTypes } from "@/lib/master-data/types";
import {
  getIndustryTemplateDefinition,
  industryTemplateDefinitions,
  normalizeIndustryTemplateId,
} from "./industry-templates";

describe("industry template contract", () => {
  it("normalizes only supported template ids and known aliases", () => {
    expect(normalizeIndustryTemplateId("electronics")).toBe("electronics");
    expect(normalizeIndustryTemplateId("Electronics")).toBe("electronics");
    expect(normalizeIndustryTemplateId("aerospace-defence")).toBe(
      "aerospace",
    );
    expect(normalizeIndustryTemplateId("medical-devices")).toBe("medical");
    expect(normalizeIndustryTemplateId("pharma")).toBeNull();
    expect(normalizeIndustryTemplateId({ id: "automotive" })).toBeNull();
  });

  it("defines durable display metadata and bounded defaults for every template", () => {
    const ids = new Set<string>();

    industryTemplateDefinitions.forEach((template) => {
      ids.add(template.id);
      expect(template.label).not.toHaveLength(0);
      expect(template.description).not.toHaveLength(0);
      expect(template.defaults.processGuidance.length).toBeGreaterThan(0);
      expect(template.defaults.requirementFocus.length).toBeGreaterThan(0);

      template.defaults.phase2ObjectTypeHints?.forEach((objectType) => {
        expect(masterDataObjectTypes).toContain(objectType);
      });
    });

    expect(ids.size).toBe(industryTemplateDefinitions.length);
    expect(getIndustryTemplateDefinition("food-beverage")?.id).toBe("food");
    expect(getIndustryTemplateDefinition("unknown")).toBeNull();
  });
});
