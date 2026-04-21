import { expect, test, type Page, type TestInfo } from "@playwright/test";
import {
  PHASE1_PROJECT_REGISTRY_STORAGE_KEY,
  createPhase1ProjectRegistry,
  type Phase1ProjectRegistry,
} from "../../src/lib/phase1/project-registry";
import {
  createPhase1UiFixtureProjectRecord,
  createPhase1UiFixtureRegistry,
} from "../../src/lib/phase1/ui-fixtures";

async function attachFullPageScreenshot(
  page: Page,
  testInfo: TestInfo,
  name: string,
) {
  const safeName = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const screenshotPath = testInfo.outputPath(`${safeName}.png`);

  await page.screenshot({
    path: screenshotPath,
    fullPage: true,
  });

  await testInfo.attach(name, {
    path: screenshotPath,
    contentType: "image/png",
  });
}

async function seedProjectRegistry(
  page: Page,
  registry: Phase1ProjectRegistry,
) {
  await page.addInitScript(
    ({ storageKey, value }) => {
      window.localStorage.clear();
      window.localStorage.setItem(storageKey, JSON.stringify(value));
    },
    {
      storageKey: PHASE1_PROJECT_REGISTRY_STORAGE_KEY,
      value: registry,
    },
  );
}

test("creates a sample project from the empty command desk", async ({
  page,
}, testInfo) => {
  await seedProjectRegistry(page, createPhase1ProjectRegistry());

  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: /start with a sample project and walk the full phase 1 flow/i,
    }),
  ).toBeVisible();
  await attachFullPageScreenshot(page, testInfo, "home-empty");

  await page.getByRole("button", { name: /start sample project/i }).click();

  await expect(page).toHaveURL(/\/projects\/.+\/source$/);
  await expect(
    page.getByRole("heading", {
      name: /choose the workbook for this run/i,
    }),
  ).toBeVisible();
  await attachFullPageScreenshot(page, testInfo, "sample-project-source");

  await page.getByRole("button", { name: /continue to generate/i }).click();

  await expect(page).toHaveURL(/\/projects\/.+\/generate$/);
  await expect(
    page.getByRole("heading", { name: /run the recommended slice first/i }),
  ).toBeVisible();
  await attachFullPageScreenshot(page, testInfo, "sample-project-generate");
});

test("verifies populated home plus source, generate, and review surfaces", async ({
  page,
}, testInfo) => {
  const registry = createPhase1UiFixtureRegistry({
    currentStep: "review",
    statusesByRequirementId: {
      "01.01": "pending",
      "01.02": "pending",
    },
  });
  const project = createPhase1UiFixtureProjectRecord({
    currentStep: "review",
    statusesByRequirementId: {
      "01.01": "pending",
      "01.02": "pending",
    },
  });

  await seedProjectRegistry(page, registry);

  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: /pick up the right customer project quickly/i,
    }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /resume project/i })).toBeVisible();
  await attachFullPageScreenshot(page, testInfo, "home-populated");

  await page.goto(`/projects/${project.projectId}/source`);
  await expect(
    page.getByRole("heading", {
      name: /choose the workbook for this run/i,
    }),
  ).toBeVisible();
  await attachFullPageScreenshot(page, testInfo, "source-studio");

  await page.goto(`/projects/${project.projectId}/generate`);
  await expect(
    page.getByRole("heading", { name: /run the recommended slice first/i }),
  ).toBeVisible();
  await attachFullPageScreenshot(page, testInfo, "generate-studio");

  await page.goto(`/projects/${project.projectId}/review`);
  await expect(
    page.getByRole("heading", {
      name: /review generated requirements/i,
    }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /approve/i }).first()).toBeVisible();
  await attachFullPageScreenshot(page, testInfo, "review-studio");
});

test("verifies script and export surfaces, including direct export access when ready", async ({
  page,
}, testInfo) => {
  const registry = createPhase1UiFixtureRegistry({
    currentStep: "review",
    statusesByRequirementId: {
      "01.01": "approved",
      "01.02": "approved",
    },
  });
  const project = createPhase1UiFixtureProjectRecord({
    currentStep: "review",
    statusesByRequirementId: {
      "01.01": "approved",
      "01.02": "approved",
    },
  });

  await seedProjectRegistry(page, registry);

  await page.goto(`/projects/${project.projectId}/script`);
  await expect(
    page.getByRole("heading", {
      name: /shape the phase 1 handoff/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /continue to export/i }),
  ).toBeEnabled();
  await attachFullPageScreenshot(page, testInfo, "script-studio");

  await page.goto(`/projects/${project.projectId}/export`);
  await expect(page).toHaveURL(new RegExp(`/projects/${project.projectId}/export$`));
  await expect(
    page.getByRole("heading", {
      name: /download the phase 1 handoff/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /download markdown/i }),
  ).toBeEnabled();
  await attachFullPageScreenshot(page, testInfo, "export-studio");
});
