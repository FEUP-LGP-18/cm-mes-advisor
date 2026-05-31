import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  FvBadge,
  FvCallout,
  FvDropzone,
  FvEmptyState,
  FvInspectorPanel,
  FvPageHeader,
  FvProgressPanel,
  FvStatCard,
  FvTable,
  FvToolbar,
} from ".";

function UploadIcon() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M4 20h16" />
    </svg>
  );
}

function FoundationPrimitivePreview() {
  return (
    <div className="fv-page" style={{ display: "grid", gap: "1.5rem" }}>
      <FvPageHeader
        actions={<button className="fv-btn-primary" type="button">Primary action</button>}
        description="Operational primitives for MES Advisor route implementations."
        eyebrow="UI Revamp / Foundation"
        title="Shared primitives"
      />

      <div className="fv-stats-row">
        <FvStatCard helper="All time" label="Total rows" value="47" />
        <FvStatCard helper="Ready for review" label="Approved" tone="success" value="31" />
        <FvStatCard helper="Needs attention" label="Flagged" tone="warning" value="6" />
        <FvStatCard helper="Awaiting review" label="Pending" progress={66} tone="info" value="10" />
      </div>

      <FvToolbar
        left={<input className="fv-search-input" placeholder="Search requirements..." type="search" />}
        right={
          <>
            <button className="fv-filter-btn" type="button">All statuses</button>
            <span className="fv-table-muted">Showing 4 rows</span>
          </>
        }
      />

      <FvTable>
        <thead>
          <tr>
            <th>Req. ID</th>
            <th>Requirement text</th>
            <th>Confidence</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="fv-mono-id">01.01</td>
            <td>Local language support for operator screens</td>
            <td><FvBadge tone="success">High</FvBadge></td>
            <td><FvBadge dot tone="success">Approved</FvBadge></td>
          </tr>
          <tr>
            <td className="fv-mono-id">01.04</td>
            <td>Kiosk option without full logout cycle</td>
            <td><FvBadge tone="warning">Medium</FvBadge></td>
            <td><FvBadge dot tone="warning">Flagged</FvBadge></td>
          </tr>
        </tbody>
      </FvTable>

      <div className="fv-two-col-wide">
        <FvDropzone
          action={<button className="fv-btn-secondary" type="button">Browse files</button>}
          body="Drag and drop an .xlsx workbook or browse files."
          icon={<UploadIcon />}
          meta="Accepted format: .xlsx only"
          title="Upload requirements"
        />

        <FvInspectorPanel
          metadata={<FvBadge compact tone="info">AI configuration</FvBadge>}
          title="Analysis setup"
        >
          <div className="fv-detail-kv">
            <span className="fv-detail-kv-label">Template</span>
            <span className="fv-detail-kv-value">Electronics</span>
          </div>
          <div className="fv-detail-kv">
            <span className="fv-detail-kv-label">MES version</span>
            <span className="fv-detail-kv-value">CM MES v10.3</span>
          </div>
        </FvInspectorPanel>
      </div>

      <FvProgressPanel
        description="Use slots for workflow-specific stage labels and logs."
        log={
          <div className="fv-terminal">
            <div className="fv-terminal-ok">14:32:01 File parsed: 47 requirements</div>
            <div className="fv-terminal-run">14:32:02 Querying MES documentation...</div>
          </div>
        }
        progress={60}
        stats={
          <div className="fv-stats-row" style={{ marginBottom: 0 }}>
            <FvStatCard label="Matched" tone="success" value="21" />
            <FvStatCard label="Low conf." tone="warning" value="5" />
          </div>
        }
        steps={[
          { label: "Extract requirements", description: "47 rows found", status: "complete" },
          { label: "Query MES documentation", description: "21 matched", status: "complete" },
          { label: "Generate AI comments", description: "Processing R-028", status: "active" },
          { label: "Build script structure", description: "Waiting", status: "pending" },
        ]}
        title="AI processing"
      />

      <FvCallout title="What happens after upload?">
        The file preview, AI configuration panel, and next action stay close to the current task.
      </FvCallout>

      <FvEmptyState
        action={<button className="fv-btn-primary" type="button">Create project</button>}
        body="Start with a project, then upload a requirements workbook."
        title="No projects yet"
      />
    </div>
  );
}

const meta = {
  title: "UI Revamp/Foundation Primitives",
  component: FoundationPrimitivePreview,
  tags: ["autodocs"],
} satisfies Meta<typeof FoundationPrimitivePreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = {};
