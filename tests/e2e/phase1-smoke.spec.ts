import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { themeStorageKey, type ThemeMode } from "../../src/app/theme";
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
  theme: ThemeMode,
) {
  await page.addInitScript(
    ({ storageKey, themeStorageKey, theme, value }) => {
      window.localStorage.clear();
      window.localStorage.setItem(storageKey, JSON.stringify(value));
      window.localStorage.setItem(themeStorageKey, theme);
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
    },
    {
      storageKey: PHASE1_PROJECT_REGISTRY_STORAGE_KEY,
      themeStorageKey,
      theme,
      value: registry,
    },
  );
}

async function assertNoHorizontalOverflow(page: Page) {
  const { scrollWidth, viewportWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));

  expect(scrollWidth).toBeLessThanOrEqual(viewportWidth + 2);
}

async function assertScrollable(locator: Locator) {
  const metrics = await locator.evaluate((node) => {
    const element = node as HTMLElement;
    const before = element.scrollTop;
    element.scrollTop = before + 240;

    return {
      before,
      after: element.scrollTop,
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
    };
  });

  expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);
  expect(metrics.after).toBeGreaterThan(metrics.before);
}

async function expectLocatorAbove(upper: Locator, lower: Locator) {
  await expect(upper).toBeVisible();
  await expect(lower).toBeVisible();

  const upperBox = await upper.boundingBox();
  const lowerBox = await lower.boundingBox();

  expect(upperBox).not.toBeNull();
  expect(lowerBox).not.toBeNull();
  expect((upperBox?.y ?? 0) + 4).toBeLessThan(lowerBox?.y ?? 0);
}

const themes: ThemeMode[] = ["dark", "light"];

for (const theme of themes) {
  test(`${theme}: creates a sample project from the empty command desk`, async ({
    page,
  }, testInfo) => {
    await seedProjectRegistry(page, createPhase1ProjectRegistry(), theme);

    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        name: /start with a sample project and walk the full phase 1 flow/i,
      }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /sample project/i })).toHaveCount(1);
    await assertNoHorizontalOverflow(page);
    await attachFullPageScreenshot(page, testInfo, `${theme}-home-empty`);

    const startButton = page.getByRole("button", {
      name: /start sample project/i,
    });
    await expect(startButton).toBeEnabled();
    await startButton.click();

    await expect(page).toHaveURL(/\/projects\/.+\/source$/);
    await expect(
      page.getByRole("heading", {
        name: "Source",
      }),
    ).toBeVisible();
    await expect(page.getByText("Sample workbook active")).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await attachFullPageScreenshot(page, testInfo, `${theme}-sample-project-source`);

  });

  test(`${theme}: verifies populated home plus source, generate, and review surfaces`, async ({
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

    await seedProjectRegistry(page, registry, theme);

    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        name: /pick up the right customer project quickly/i,
      }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /resume project/i })).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await attachFullPageScreenshot(page, testInfo, `${theme}-home-populated`);

    await page.goto(`/projects/${project.projectId}/source`);
    await expect(
      page.getByRole("heading", {
        name: "Source",
      }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /continue to generate/i })).toBeEnabled();
    await assertNoHorizontalOverflow(page);
    await attachFullPageScreenshot(page, testInfo, `${theme}-source-studio`);

    await page.goto(`/projects/${project.projectId}/generate`);
    await expect(
      page.getByRole("heading", { name: "Generate" }),
    ).toBeVisible();
    await expect(page.getByText("Row explorer — search, filter, and select")).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await attachFullPageScreenshot(page, testInfo, `${theme}-generate-studio`);

    const generateDraftButton = page.getByRole("button", {
      name: /generate recommended draft/i,
    });
    await expect(generateDraftButton).toBeEnabled();
    await generateDraftButton.click();

    await expect(page).toHaveURL(
      new RegExp(`/projects/${project.projectId}/review$`),
    );
    await expect(
      page.getByRole("heading", {
        name: "Requirements Review",
      }),
    ).toBeVisible();
    await expect(page.getByText(/^Pending requirements$/).first()).toBeVisible();
    await expect(
      page.getByRole("table", {
        name: "Generated requirements review table",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("complementary", { name: "Selected requirement" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /approve/i }).first()).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await attachFullPageScreenshot(page, testInfo, `${theme}-review-studio`);

    await page
      .getByRole("button", { name: "Select 01.02 for inspection" })
      .click();
    const selectedInspector = page.getByRole("complementary", {
      name: "Selected requirement",
    });
    await expect(selectedInspector).toBeVisible();
    await expect(selectedInspector.getByText("01.02", { exact: true })).toBeVisible();
    await expect(
      selectedInspector.getByRole("heading", {
        name: "Resource scheduling support",
      }),
    ).toBeVisible();
    await expect(
      selectedInspector.getByRole("button", { name: "Approve" }),
    ).toBeVisible();

    if (testInfo.project.name.includes("mobile")) {
      await expect(
        selectedInspector.getByRole("button", { name: "Approve" }),
      ).toBeEnabled();
    }

    await attachFullPageScreenshot(page, testInfo, `${theme}-review-row-selected`);
  });

  test(`${theme}: verifies script and export surfaces, including direct export access when ready`, async ({
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

    await seedProjectRegistry(page, registry, theme);

    await page.goto(`/projects/${project.projectId}/script`);
    await expect(
      page.getByRole("heading", {
        name: "Script",
      }),
    ).toBeVisible();
    await expect(page.getByText(/^Script editor$/).first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: /continue to export/i }),
    ).toBeEnabled();
    await assertNoHorizontalOverflow(page);

    if (testInfo.project.name.includes("mobile")) {
      await expectLocatorAbove(
        page.getByText(/^Script editor$/).first(),
        page.locator("summary").filter({ hasText: /^Section outline$/ }).first(),
      );
    } else {
      await assertScrollable(page.locator(".phase-document-sidebar-scroll").first());
    }

    await attachFullPageScreenshot(page, testInfo, `${theme}-script-studio`);

    await page.goto(`/projects/${project.projectId}/export`);
    await expect(page).toHaveURL(new RegExp(`/projects/${project.projectId}/export$`));
    await expect(
      page.getByRole("heading", {
        name: "Export",
      }),
    ).toBeVisible();
    await expect(page.getByText("Finalize the Phase 1 deliverable")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /download markdown/i }),
    ).toBeEnabled();
    await assertNoHorizontalOverflow(page);

    if (testInfo.project.name.includes("mobile")) {
      await expectLocatorAbove(
        page.getByText(/^Download Markdown$/).first(),
        page.locator("summary").filter({ hasText: /^Included sections$/ }).first(),
      );
    }

    await attachFullPageScreenshot(page, testInfo, `${theme}-export-studio`);
  });
}
