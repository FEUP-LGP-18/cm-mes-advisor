import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { themeStorageKey } from "../../src/app/theme";
import {
  PHASE1_PROJECT_REGISTRY_STORAGE_KEY,
  type Phase1ProjectRegistry,
} from "../../src/lib/phase1/project-registry";
import {
  createPhase1UiFixtureProjectRecord,
  createPhase1UiFixtureRegistry,
} from "../../src/lib/phase1/ui-fixtures";

async function seedProjectRegistry(
  page: Page,
  registry: Phase1ProjectRegistry,
) {
  await page.addInitScript(
    ({ storageKey, themeStorageKey, value }) => {
      if (!window.localStorage.getItem(storageKey)) {
        window.localStorage.clear();
        window.localStorage.setItem(storageKey, JSON.stringify(value));
      }
      window.localStorage.setItem(themeStorageKey, "light");
      document.documentElement.dataset.theme = "light";
      document.documentElement.style.colorScheme = "light";
    },
    {
      storageKey: PHASE1_PROJECT_REGISTRY_STORAGE_KEY,
      themeStorageKey,
      value: registry,
    },
  );
}

async function attachFullPageScreenshot(
  page: Page,
  testInfo: TestInfo,
  name: string,
) {
  const screenshotPath = testInfo.outputPath(`${name}.png`);

  await page.screenshot({
    fullPage: true,
    path: screenshotPath,
  });

  await testInfo.attach(name, {
    path: screenshotPath,
    contentType: "image/png",
  });
}

async function assertNoHorizontalOverflow(page: Page) {
  const { scrollWidth, viewportWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));

  expect(scrollWidth).toBeLessThanOrEqual(viewportWidth + 2);
}

async function approveGeneratedMasterDataObjects(page: Page) {
  const approveButton = page.getByRole("button", {
    name: "Approve and next object",
  });
  const openExportButton = page.getByRole("button", { name: "Open export" });

  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (await openExportButton.isEnabled()) {
      return;
    }

    await expect(approveButton).toBeEnabled();
    await approveButton.click();
  }

  await expect(openExportButton).toBeEnabled();
}

test("locked Phase 2 setup hides inactive generation controls", async ({
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
  await page.goto(`/projects/${project.projectId}/master-data/setup`);

  await expect(
    page.getByRole("heading", {
      name: /approve phase 1 rows before you continue into master data/i,
    }),
  ).toBeVisible();
  await expect(page.getByText("Grounded real generation")).toHaveCount(0);
  await expect(page.getByText("Object scope")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Generate Master Data" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Open Phase 1 review" }),
  ).toBeVisible();
  await assertNoHorizontalOverflow(page);
  await attachFullPageScreenshot(page, testInfo, "phase2-locked-setup");
});

test("approved Phase 1 rows can move through Phase 2 draft review and traceability", async ({
  page,
}, testInfo) => {
  const registry = createPhase1UiFixtureRegistry({
    currentStep: "export",
    statusesByRequirementId: {
      "01.01": "approved",
      "01.02": "approved",
    },
  });
  const project = createPhase1UiFixtureProjectRecord({
    currentStep: "export",
    statusesByRequirementId: {
      "01.01": "approved",
      "01.02": "approved",
    },
  });

  await seedProjectRegistry(page, registry);
  await page.goto(`/projects/${project.projectId}/master-data/setup`);

  await expect(page.getByText("Prototype drafts").first()).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Analyze approved rows" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Analyze approved rows" }).click();
  await expect(page.getByText("Batch review support")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue to processing" }),
  ).toBeEnabled();
  await assertNoHorizontalOverflow(page);
  await attachFullPageScreenshot(page, testInfo, "phase2-setup-ready");

  await page.getByRole("button", { name: "Continue to processing" }).click();
  await expect(
    page.getByRole("heading", { name: "Review package ready" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Open review" })).toBeEnabled();
  await assertNoHorizontalOverflow(page);
  await attachFullPageScreenshot(page, testInfo, "phase2-process-ready");

  await page.getByRole("button", { name: "Open review" }).click();
  await expect(
    page.getByRole("heading", {
      name: /approve the generated objects before export/i,
    }),
  ).toBeVisible();
  await assertNoHorizontalOverflow(page);
  await attachFullPageScreenshot(page, testInfo, "phase2-review");

  await approveGeneratedMasterDataObjects(page);
  await page.goto(`/projects/${project.projectId}/master-data/export`);
  await expect(
    page.getByRole("heading", {
      name: /download the master data package once the review gate is clear/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Download Master Data package" }),
  ).toBeEnabled();
  await assertNoHorizontalOverflow(page);
  await attachFullPageScreenshot(page, testInfo, "phase2-export");

  await page.getByRole("button", { name: "Open traceability" }).click();
  await expect(
    page.getByRole("heading", {
      name: /keep the requirement-to-object audit trail visible/i,
    }),
  ).toBeVisible();
  await page
    .getByPlaceholder("Search requirement, object, field, or value...")
    .fill("no matching traceability row");
  await expect(page.getByText("No traceability rows match that search.")).toBeVisible();
  await assertNoHorizontalOverflow(page);
  await attachFullPageScreenshot(page, testInfo, "phase2-traceability-empty-search");
});
