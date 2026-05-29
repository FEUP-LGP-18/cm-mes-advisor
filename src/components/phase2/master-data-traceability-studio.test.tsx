import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import MasterDataTraceabilityStudio, {
  filterMasterDataTraceabilityRecords,
} from "./master-data-traceability-studio";
import type { MasterDataTraceabilityRecord } from "@/lib/master-data/types";

function render(element: ReactElement) {
  return renderToStaticMarkup(element);
}

const traceabilityRecord: MasterDataTraceabilityRecord = {
  fieldKey: "Name",
  fieldLabel: "Name",
  note: "Mapped from the approved product setup row.",
  objectId: "product:demo-product",
  objectName: "Demo Product",
  objectType: "product",
  requirementId: "03.01",
  requirementKey: "28:03.01",
  source: "generated",
  sourceRowNumber: 28,
  traceId: "trace:demo-product:name",
  value: "Demo Product",
};

describe("MasterDataTraceabilityStudio", () => {
  it("renders a clear empty state before traceability exists", () => {
    const html = render(
      <MasterDataTraceabilityStudio
        onReturnToExport={vi.fn()}
        records={[]}
      />,
    );

    expect(html).toContain("No traceability links yet");
    expect(html).toContain("Back to Export");
    expect(html).toContain("Return to export after the generated Master Data objects are reviewed");
  });

  it("filters traceability records and supports a no-results state", () => {
    expect(
      filterMasterDataTraceabilityRecords([traceabilityRecord], "resource"),
    ).toEqual([]);
    expect(
      filterMasterDataTraceabilityRecords([traceabilityRecord], "demo product"),
    ).toEqual([traceabilityRecord]);
  });
});
