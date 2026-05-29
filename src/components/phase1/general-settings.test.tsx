import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { GeneralSettingsView } from "./general-settings";
import type { GeneralSettingsViewProps } from "./general-settings";
import type { Project, ProjectActivityEvent } from "@/lib/projects/types";

const activeProject: Project = {
  archivedAt: null,
  createdAt: "2026-05-01T12:00:00.000Z",
  createdBy: "11111111-1111-4111-8111-111111111111",
  customerName: "Customer X",
  description: "Demo workspace",
  id: "22222222-2222-4222-8222-222222222222",
  name: "Customer X MES demo",
  status: "active",
  updatedAt: "2026-05-10T12:00:00.000Z",
  updatedBy: "11111111-1111-4111-8111-111111111111",
};

const archivedProject: Project = {
  ...activeProject,
  archivedAt: "2026-05-11T10:00:00.000Z",
  status: "archived",
};

const activityEvents: ProjectActivityEvent[] = [
  {
    actorId: "11111111-1111-4111-8111-111111111111",
    createdAt: "2026-05-12T09:00:00.000Z",
    eventType: "project_metadata_updated",
    id: "33333333-3333-4333-8333-333333333333",
    payload: {
      name: "Customer X MES demo",
    },
    projectId: activeProject.id,
  },
  {
    actorId: "11111111-1111-4111-8111-111111111111",
    createdAt: "2026-05-12T10:00:00.000Z",
    eventType: "project_archived",
    id: "44444444-4444-4444-8444-444444444444",
    payload: {},
    projectId: activeProject.id,
  },
];

const noop = vi.fn();

function makeProps(
  overrides: Partial<GeneralSettingsViewProps> = {},
): GeneralSettingsViewProps {
  return {
    actionFeedback: null,
    archiveConfirmOpen: false,
    deleteConfirmInput: "",
    deleteConfirmOpen: false,
    formCustomerName: activeProject.customerName ?? "",
    formDescription: activeProject.description ?? "",
    formName: activeProject.name,
    formNameError: null,
    isArchiving: false,
    isDeleting: false,
    isOwner: true,
    isServerBacked: true,
    isSaving: false,
    project: activeProject,
    projectId: activeProject.id,
    projectName: activeProject.name,
    recentActivityEvents: [],
    onArchiveCancel: noop,
    onArchiveConfirm: noop,
    onArchiveRequest: noop,
    onDeleteCancel: noop,
    onDeleteConfirm: noop,
    onDeleteConfirmInputChange: noop,
    onDeleteRequest: noop,
    onFormCustomerNameChange: noop,
    onFormDescriptionChange: noop,
    onFormNameChange: noop,
    onFormSubmit: noop,
    onRemoveLocalProject: noop,
    onResetLocalProject: noop,
    onUnarchiveRequest: noop,
    ...overrides,
  };
}

describe("GeneralSettingsView", () => {
  it("renders the project name form for an owner", () => {
    const html = renderToStaticMarkup(<GeneralSettingsView {...makeProps()} />);

    expect(html).toContain("Customer X MES demo");
    expect(html).toContain("Save changes");
  });

  it("does not render save button for non-owners", () => {
    const html = renderToStaticMarkup(
      <GeneralSettingsView {...makeProps({ isOwner: false })} />,
    );

    expect(html).not.toContain("Save changes");
    expect(html).toContain("read-only access");
  });

  it("does not render archive or delete sections for non-owners", () => {
    const html = renderToStaticMarkup(
      <GeneralSettingsView {...makeProps({ isOwner: false })} />,
    );

    expect(html).not.toContain("Archive project");
    expect(html).not.toContain("Delete project");
  });

  it("renders archive section for owners on an active project", () => {
    const html = renderToStaticMarkup(
      <GeneralSettingsView {...makeProps({ isOwner: true })} />,
    );

    expect(html).toContain("Archive project");
    expect(html).not.toContain("Unarchive project");
  });

  it("renders unarchive section for owners on an archived project", () => {
    const html = renderToStaticMarkup(
      <GeneralSettingsView
        {...makeProps({ project: archivedProject, isOwner: true })}
      />,
    );

    expect(html).toContain("Unarchive project");
    expect(html).toContain("Restore this project to active status");
  });

  it("renders delete section for owners", () => {
    const html = renderToStaticMarkup(
      <GeneralSettingsView {...makeProps({ isOwner: true })} />,
    );

    expect(html).toContain("Delete project");
  });

  it("hides server-only fields and exposes local demo recovery actions for local projects", () => {
    const html = renderToStaticMarkup(
      <GeneralSettingsView {...makeProps({ isServerBacked: false })} />,
    );

    expect(html).toContain("Project details");
    expect(html).not.toContain("Description");
    expect(html).not.toContain("Archive project");
    expect(html).not.toContain("Delete project");
    expect(html).toContain("Local demo controls");
    expect(html).toContain("Reset to sample start");
    expect(html).toContain("Remove from local list");
  });

  it("shows archive confirmation panel when archiveConfirmOpen is true", () => {
    const html = renderToStaticMarkup(
      <GeneralSettingsView {...makeProps({ archiveConfirmOpen: true })} />,
    );

    expect(html).toContain("Confirm archive");
    expect(html).toContain("Cancel");
  });

  it("shows delete confirmation panel with text input when deleteConfirmOpen is true", () => {
    const html = renderToStaticMarkup(
      <GeneralSettingsView {...makeProps({ deleteConfirmOpen: true })} />,
    );

    expect(html).toContain("Type project name to confirm deletion");
    expect(html).toContain("Delete project");
    expect(html).toContain("Cancel");
  });

  it("shows the delete button as disabled when confirmation input does not match project name", () => {
    const html = renderToStaticMarkup(
      <GeneralSettingsView
        {...makeProps({
          deleteConfirmOpen: true,
          deleteConfirmInput: "wrong name",
          projectName: "Customer X MES demo",
        })}
      />,
    );

    expect(html).toContain('disabled=""');
  });

  it("shows the delete button as enabled when confirmation input exactly matches the project name", () => {
    const html = renderToStaticMarkup(
      <GeneralSettingsView
        {...makeProps({
          deleteConfirmOpen: true,
          deleteConfirmInput: "Customer X MES demo",
          projectName: "Customer X MES demo",
        })}
      />,
    );

    const deleteButtonMatch = html.match(
      /Delete project(?:[^<]|<(?!button))*?<\/button>/,
    );
    expect(deleteButtonMatch).not.toBeNull();
    expect(html).not.toContain('aria-disabled="true"');
  });

  it("renders a success feedback message", () => {
    const html = renderToStaticMarkup(
      <GeneralSettingsView
        {...makeProps({
          actionFeedback: {
            message: "Project details saved.",
            tone: "success",
          },
        })}
      />,
    );

    expect(html).toContain("Project details saved.");
    expect(html).toContain("fv-callout-success");
    expect(html).toContain('role="status"');
  });

  it("renders an error feedback message", () => {
    const html = renderToStaticMarkup(
      <GeneralSettingsView
        {...makeProps({
          actionFeedback: {
            message: "Changes could not be saved.",
            tone: "error",
          },
        })}
      />,
    );

    expect(html).toContain("Changes could not be saved.");
    expect(html).toContain("fv-callout-error");
    expect(html).toContain('role="alert"');
  });

  it("renders a field validation error for an empty project name", () => {
    const html = renderToStaticMarkup(
      <GeneralSettingsView
        {...makeProps({ formNameError: "Project name is required." })}
      />,
    );

    expect(html).toContain("Project name is required.");
  });

  it("disables all form inputs while saving", () => {
    const html = renderToStaticMarkup(
      <GeneralSettingsView {...makeProps({ isSaving: true })} />,
    );

    expect(html).toContain("Saving…");
  });

  it("shows lifecycle controls for archived projects", () => {
    const html = renderToStaticMarkup(
      <GeneralSettingsView {...makeProps({ project: archivedProject })} />,
    );

    expect(html).toContain("Unarchive project");
    expect(html).toContain("Restore this project to active status");
  });

  it("shows read-only project detail access for non-owners", () => {
    const html = renderToStaticMarkup(
      <GeneralSettingsView {...makeProps({ isOwner: false })} />,
    );

    expect(html).toContain("You have read-only access to project details.");
    expect(html).not.toContain("Save changes");
  });

  it("keeps the isolated view focused on editable project detail controls", () => {
    const html = renderToStaticMarkup(<GeneralSettingsView {...makeProps()} />);

    expect(html).toContain("Project details");
    expect(html).toContain("Copy project link");
    expect(html).toContain("Save changes");
  });

  it("surfaces recent lifecycle activity and copy-link affordance", () => {
    const html = renderToStaticMarkup(
      <GeneralSettingsView
        {...makeProps({ recentActivityEvents: activityEvents })}
      />,
    );

    expect(html).toContain("Copy project link");
    expect(html).toContain("Recent activity");
    expect(html).toContain("Project details updated");
    expect(html).toContain("Project archived");
  });

  it("renders without crashing when project is null", () => {
    const html = renderToStaticMarkup(
      <GeneralSettingsView
        {...makeProps({ project: null, formName: "Fallback name" })}
      />,
    );

    expect(html).toContain("Fallback name");
  });
});
