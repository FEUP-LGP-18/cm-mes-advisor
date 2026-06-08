import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { Buffer } from "node:buffer";
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
  const approveButton = page.getByRole("button", { name: /^Approve/ });
  const allApprovedBanner = page.getByText(/All \d+ objects approved/i);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (await allApprovedBanner.isVisible()) {
      return;
    }
    await expect(approveButton).toBeEnabled();
    await approveButton.click();
  }

  await expect(allApprovedBanner).toBeVisible();
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
      name: "Upload Requirements File",
    }),
  ).toBeVisible();
  await expect(page.getByText(/phase 1 approval required/i)).toBeVisible();
  await expect(page.getByText("Grounded real generation")).toHaveCount(0);
  await expect(page.getByText("Object scope")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Generate Master Data" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /analyze requirements/i }),
  ).toBeDisabled();
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

  await expect(page.getByRole("heading", { name: "Upload Requirements File" })).toBeVisible();
  await expect(page.getByText(/phase 1 requirements loaded/i)).toBeVisible();
  await expect(page.getByText(/2 approved rows/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /browse files/i })).toBeEnabled();
  await expect(
    page.getByRole("button", { name: /analyze requirements/i }),
  ).toBeVisible();
  await page.getByLabel(/phase 2 requirements workbook/i).setInputFiles({
    buffer: Buffer.from("fixture workbook payload"),
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    name: "customer-master-data.xlsx",
  });
  await expect(page.getByRole("heading", { name: "Requirements Analysis" })).toBeVisible();
  await expect(page.getByText("Requirements → MES Object Mapping")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /generate master data/i }),
  ).toBeEnabled();
  await assertNoHorizontalOverflow(page);
  await attachFullPageScreenshot(page, testInfo, "phase2-setup-ready");

  await page.getByRole("button", { name: /generate master data/i }).click();
  await expect(
    page.getByRole("heading", { name: "Master Data Generated" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /review results/i })).toBeEnabled();
  await assertNoHorizontalOverflow(page);
  await attachFullPageScreenshot(page, testInfo, "phase2-process-ready");

  await page.getByRole("button", { name: /review results/i }).click();
  await expect(
    page.getByRole("heading", {
      name: "Review Master Data",
    }),
  ).toBeVisible();
  await assertNoHorizontalOverflow(page);
  await attachFullPageScreenshot(page, testInfo, "phase2-review");

  await approveGeneratedMasterDataObjects(page);
  await page.getByRole("button", { name: /proceed to export/i }).click();
  await expect(
    page.getByRole("heading", {
      name: "Export Master Data",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /download master data package/i }),
  ).toBeEnabled();
  await expect(page.getByRole("button", { name: "View Traceability" })).toHaveCount(0);
  await page.goto(`/projects/${project.projectId}/master-data/traceability`);
  await expect(page).toHaveURL(
    new RegExp(`/projects/${project.projectId}/master-data/export$`),
  );
  await expect(
    page.getByRole("button", { name: /download master data package/i }),
  ).toBeEnabled();
  await assertNoHorizontalOverflow(page);
  await attachFullPageScreenshot(page, testInfo, "phase2-export");

  await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /download master data package/i }).click(),
  ]);
  await expect(page.getByRole("heading", { name: "Export Complete" })).toBeVisible({
    timeout: 10000,
  });

  await page.getByRole("button", { name: "View Traceability" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Traceability",
    }),
  ).toBeVisible();
  await page
    .getByPlaceholder("Search requirement, object, field, value…")
    .fill("no matching traceability row");
  await expect(page.getByText(/No traceability rows match/)).toBeVisible();
  await assertNoHorizontalOverflow(page);
  await attachFullPageScreenshot(page, testInfo, "phase2-traceability-empty-search");
});
