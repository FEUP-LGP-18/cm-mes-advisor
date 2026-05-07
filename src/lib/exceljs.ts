import type { Workbook as ExcelJsWorkbook } from "exceljs";

type WorkbookConstructor = new () => ExcelJsWorkbook;

export async function createExcelJsWorkbook(): Promise<ExcelJsWorkbook> {
  const Workbook = await loadExcelJsWorkbookConstructor();
  return new Workbook();
}

async function loadExcelJsWorkbookConstructor(): Promise<WorkbookConstructor> {
  const excelJsModule = await import("exceljs");
  const workbookConstructor =
    "Workbook" in excelJsModule && typeof excelJsModule.Workbook === "function"
      ? excelJsModule.Workbook
      : "default" in excelJsModule &&
          excelJsModule.default &&
          typeof excelJsModule.default === "object" &&
          "Workbook" in excelJsModule.default &&
          typeof excelJsModule.default.Workbook === "function"
        ? excelJsModule.default.Workbook
        : null;

  if (!workbookConstructor) {
    throw new Error("exceljs Workbook constructor is unavailable.");
  }

  return workbookConstructor as WorkbookConstructor;
}
