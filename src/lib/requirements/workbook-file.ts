export function assertRequirementsWorkbookFilename(fileName: string): void {
  if (!/\.xlsx$/i.test(fileName.trim())) {
    throw new Error(
      "Only .xlsx workbooks are supported for requirements upload.",
    );
  }
}
