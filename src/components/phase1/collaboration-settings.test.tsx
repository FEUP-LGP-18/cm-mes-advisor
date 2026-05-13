import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  CollaborationSettingsView,
  type CollaborationSettingsViewProps,
} from "./collaboration-settings";
import type { ProjectInvite, ProjectMember } from "@/lib/projects/types";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => React.createElement("a", { className, href }, children),
}));

const noop = () => {};

const ownerMember: ProjectMember = {
  email: "alice@example.com",
  joinedAt: "2026-01-15T10:00:00.000Z",
  name: "Alice",
  role: "owner",
  userId: "11111111-1111-4111-8111-111111111111",
};

const editorMember: ProjectMember = {
  email: "bob@example.com",
  joinedAt: "2026-02-10T10:00:00.000Z",
  name: "Bob",
  role: "editor",
  userId: "22222222-2222-4222-8222-222222222222",
};

const pendingInvite: ProjectInvite = {
  acceptedAt: null,
  createdAt: "2026-05-01T10:00:00.000Z",
  email: "carol@example.com",
  expiresAt: "2026-05-08T10:00:00.000Z",
  id: "33333333-3333-4333-8333-333333333333",
  invitedBy: ownerMember.userId,
  projectId: "p1",
  revokedAt: null,
  role: "editor",
  status: "pending",
  updatedAt: "2026-05-01T10:00:00.000Z",
};

const revokedInvite: ProjectInvite = {
  ...pendingInvite,
  id: "44444444-4444-4444-8444-444444444444",
  status: "revoked",
  revokedAt: "2026-05-02T10:00:00.000Z",
};

function makeProps(
  overrides: Partial<CollaborationSettingsViewProps> = {},
): CollaborationSettingsViewProps {
  return {
    actionFeedback: null,
    error: null,
    inviteActionId: null,
    inviteEmail: "",
    inviteFieldError: null,
    inviteRole: "editor",
    invites: [],
    isOwner: true,
    isSubmittingInvite: false,
    loading: false,
    memberActionId: null,
    members: [ownerMember],
    projectId: "p1",
    projectName: "Test Project",
    onInviteEmailChange: noop,
    onInviteResend: noop,
    onInviteRevoke: noop,
    onInviteRoleChange: noop,
    onInviteSubmit: noop,
    onMemberRemove: noop,
    onMemberRoleChange: noop,
    ...overrides,
  };
}

describe("CollaborationSettingsView", () => {
  describe("loading state", () => {
    it("shows a loading message and hides all sections", () => {
      const markup = renderToStaticMarkup(
        <CollaborationSettingsView {...makeProps({ loading: true })} />,
      );

      expect(markup).toContain("Loading collaboration data");
      expect(markup).not.toContain("Team members");
      expect(markup).not.toContain("Invite a collaborator");
    });
  });

  describe("error state", () => {
    it("shows the error message and hides content sections", () => {
      const markup = renderToStaticMarkup(
        <CollaborationSettingsView
          {...makeProps({ error: "Something went wrong." })}
        />,
      );

      expect(markup).toContain("Something went wrong.");
      expect(markup).not.toContain("Team members");
    });
  });

  describe("owner view", () => {
    it("renders the invite form", () => {
      const markup = renderToStaticMarkup(
        <CollaborationSettingsView {...makeProps()} />,
      );

      expect(markup).toContain("Invite a collaborator");
      expect(markup).toContain("Send invite");
      expect(markup).toContain('type="email"');
    });

    it("renders the pending invites section", () => {
      const markup = renderToStaticMarkup(
        <CollaborationSettingsView
          {...makeProps({ invites: [pendingInvite] })}
        />,
      );

      expect(markup).toContain("Pending invites");
      expect(markup).toContain("carol@example.com");
      expect(markup).toContain("Resend");
      expect(markup).toContain("Revoke");
    });

    it("only shows pending invites in the table, not revoked ones", () => {
      const markup = renderToStaticMarkup(
        <CollaborationSettingsView
          {...makeProps({ invites: [pendingInvite, revokedInvite] })}
        />,
      );

      // Each pending row has one Revoke button. That button contributes two
      // matches: the aria-label text and the visible button label. One pending
      // invite → 2 matches. The revoked invite is filtered out and absent.
      const revokeCount = (markup.match(/Revoke/g) ?? []).length;
      expect(revokeCount).toBe(2);
    });

    it("renders role-change dropdowns for each member", () => {
      const markup = renderToStaticMarkup(
        <CollaborationSettingsView
          {...makeProps({ members: [ownerMember, editorMember] })}
        />,
      );

      expect(markup).toContain("Team members");
      // Two role selects — one per member
      const selectCount = (markup.match(/<select/g) ?? []).length;
      // At minimum 2: role selects for each member, plus the invite role select
      expect(selectCount).toBeGreaterThanOrEqual(3);
    });

    it("renders remove buttons for each member", () => {
      const markup = renderToStaticMarkup(
        <CollaborationSettingsView
          {...makeProps({ members: [ownerMember, editorMember] })}
        />,
      );

      // Each member row contributes two "Remove" occurrences: aria-label + button text.
      const removeCount = (markup.match(/Remove/g) ?? []).length;
      expect(removeCount).toBe(4);
    });

    it("shows member name and email when both are present", () => {
      const markup = renderToStaticMarkup(
        <CollaborationSettingsView {...makeProps()} />,
      );

      expect(markup).toContain("Alice");
      expect(markup).toContain("alice@example.com");
    });

    it("falls back to email when name is absent", () => {
      const noName = { ...ownerMember, name: null };
      const markup = renderToStaticMarkup(
        <CollaborationSettingsView {...makeProps({ members: [noName] })} />,
      );

      expect(markup).toContain("alice@example.com");
    });

    it("falls back to truncated userId when name and email are absent", () => {
      const anonymous: ProjectMember = {
        ...ownerMember,
        email: null,
        name: null,
      };
      const markup = renderToStaticMarkup(
        <CollaborationSettingsView {...makeProps({ members: [anonymous] })} />,
      );

      // First 8 chars of userId
      expect(markup).toContain("11111111");
    });

    it("shows empty state for members when list is empty", () => {
      const markup = renderToStaticMarkup(
        <CollaborationSettingsView {...makeProps({ members: [] })} />,
      );

      expect(markup).toContain("No members found.");
    });

    it("shows empty state for pending invites when none exist", () => {
      const markup = renderToStaticMarkup(
        <CollaborationSettingsView {...makeProps({ invites: [] })} />,
      );

      expect(markup).toContain("No pending invites.");
    });

    it("disables invite form fields while submitting", () => {
      const markup = renderToStaticMarkup(
        <CollaborationSettingsView
          {...makeProps({ isSubmittingInvite: true, inviteEmail: "x@y.com" })}
        />,
      );

      expect(markup).toContain("Sending…");
      // submit button and fields should be disabled
      expect(markup).toContain("disabled");
    });

    it("shows the invite field error when present", () => {
      const markup = renderToStaticMarkup(
        <CollaborationSettingsView
          {...makeProps({ inviteFieldError: "A pending invite already exists for this email." })}
        />,
      );

      expect(markup).toContain("A pending invite already exists for this email.");
    });

    it("disables member action buttons while an action is in progress", () => {
      const markup = renderToStaticMarkup(
        <CollaborationSettingsView
          {...makeProps({ memberActionId: ownerMember.userId })}
        />,
      );

      expect(markup).toContain("Removing…");
    });

    it("disables invite action buttons while an invite action is in progress", () => {
      const markup = renderToStaticMarkup(
        <CollaborationSettingsView
          {...makeProps({
            invites: [pendingInvite],
            inviteActionId: pendingInvite.id,
          })}
        />,
      );

      expect(markup).toContain("Working…");
    });

    it("shows breadcrumb with project name and Settings link", () => {
      const markup = renderToStaticMarkup(
        <CollaborationSettingsView {...makeProps()} />,
      );

      expect(markup).toContain("Test Project");
      expect(markup).toContain("Collaboration");
      expect(markup).toContain("/projects/p1");
    });
  });

  describe("non-owner view", () => {
    it("does not render the invite form", () => {
      const markup = renderToStaticMarkup(
        <CollaborationSettingsView {...makeProps({ isOwner: false })} />,
      );

      expect(markup).not.toContain("Invite a collaborator");
      expect(markup).not.toContain("Send invite");
    });

    it("does not render the pending invites section", () => {
      const markup = renderToStaticMarkup(
        <CollaborationSettingsView
          {...makeProps({ isOwner: false, invites: [pendingInvite] })}
        />,
      );

      expect(markup).not.toContain("Pending invites");
    });

    it("does not render role-change dropdowns for members", () => {
      const markup = renderToStaticMarkup(
        <CollaborationSettingsView
          {...makeProps({ isOwner: false, members: [ownerMember, editorMember] })}
        />,
      );

      // No select elements at all (no role dropdowns, no invite role select)
      expect(markup).not.toContain("<select");
    });

    it("does not render remove member buttons", () => {
      const markup = renderToStaticMarkup(
        <CollaborationSettingsView
          {...makeProps({ isOwner: false, members: [ownerMember, editorMember] })}
        />,
      );

      expect(markup).not.toContain("Remove");
    });

    it("shows a read-only pill in the breadcrumb area", () => {
      const markup = renderToStaticMarkup(
        <CollaborationSettingsView {...makeProps({ isOwner: false })} />,
      );

      expect(markup).toContain("Read-only");
    });

    it("shows a limited-access explanation", () => {
      const markup = renderToStaticMarkup(
        <CollaborationSettingsView {...makeProps({ isOwner: false })} />,
      );

      expect(markup).toContain("owner access");
    });

    it("still renders the team members table", () => {
      const markup = renderToStaticMarkup(
        <CollaborationSettingsView
          {...makeProps({ isOwner: false, members: [ownerMember, editorMember] })}
        />,
      );

      expect(markup).toContain("Team members");
      expect(markup).toContain("Alice");
      expect(markup).toContain("Bob");
    });

    it("shows role as plain text, not a dropdown", () => {
      const markup = renderToStaticMarkup(
        <CollaborationSettingsView
          {...makeProps({ isOwner: false, members: [ownerMember] })}
        />,
      );

      expect(markup).toContain("Owner");
      expect(markup).not.toContain("<select");
    });
  });

  describe("action feedback", () => {
    it("shows a success feedback banner", () => {
      const markup = renderToStaticMarkup(
        <CollaborationSettingsView
          {...makeProps({
            actionFeedback: { message: "Role updated.", tone: "success" },
          })}
        />,
      );

      expect(markup).toContain("Role updated.");
      expect(markup).toContain("phase-feedback-success");
    });

    it("shows an error feedback banner", () => {
      const markup = renderToStaticMarkup(
        <CollaborationSettingsView
          {...makeProps({
            actionFeedback: {
              message: "Cannot demote the last project owner.",
              tone: "error",
            },
          })}
        />,
      );

      expect(markup).toContain("Cannot demote the last project owner.");
      expect(markup).toContain("phase-feedback-error");
    });
  });
});
