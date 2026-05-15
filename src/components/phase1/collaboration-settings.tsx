"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Phase1Topbar from "./phase-topbar";
import { usePhase1Project } from "./project-provider";
import type { ProjectInvite, ProjectMember, ProjectRole } from "@/lib/projects/types";

const ROLES: { label: string; value: ProjectRole }[] = [
  { label: "Viewer", value: "viewer" },
  { label: "Editor", value: "editor" },
  { label: "Owner", value: "owner" },
];

function roleLabel(role: ProjectRole): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function displayName(member: ProjectMember): string {
  if (member.name) return member.name;
  if (member.email) return member.email;
  return `${member.userId.slice(0, 8)}…`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface ActionFeedback {
  message: string;
  tone: "error" | "success";
}

export interface CollaborationSettingsViewProps {
  actionFeedback: ActionFeedback | null;
  error: string | null;
  inviteActionId: string | null;
  inviteEmail: string;
  inviteFieldError: string | null;
  inviteRole: ProjectRole;
  invites: ProjectInvite[];
  isOwner: boolean;
  isSubmittingInvite: boolean;
  loading: boolean;
  memberActionId: string | null;
  members: ProjectMember[];
  projectId: string;
  projectName: string;
  onInviteEmailChange: (email: string) => void;
  onInviteResend: (inviteId: string) => void;
  onInviteRevoke: (inviteId: string) => void;
  onInviteRoleChange: (role: ProjectRole) => void;
  onInviteSubmit: (e: React.FormEvent) => void;
  onMemberRemove: (userId: string) => void;
  onMemberRoleChange: (userId: string, role: ProjectRole) => void;
}

export function CollaborationSettingsView({
  actionFeedback,
  error,
  inviteActionId,
  inviteEmail,
  inviteFieldError,
  inviteRole,
  invites,
  isOwner,
  isSubmittingInvite,
  loading,
  memberActionId,
  members,
  projectId,
  projectName,
  onInviteEmailChange,
  onInviteResend,
  onInviteRevoke,
  onInviteRoleChange,
  onInviteSubmit,
  onMemberRemove,
  onMemberRoleChange,
}: CollaborationSettingsViewProps) {
  const pendingInvites = invites.filter((inv) => inv.status === "pending");

  return (
    <div className="mx-auto flex w-full max-w-[1560px] flex-col gap-6 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
      <header className="phase-shell-header">
        <div className="phase-shell-header-top w-full">
          <div className="phase-shell-breadcrumbs">
            <Link href="/" className="phase-product-link">
              Projects
            </Link>
            <span className="phase-shell-divider">/</span>
            <Link
              href={`/projects/${projectId}`}
              className="phase-product-link"
            >
              {projectName}
            </Link>
            <span className="phase-shell-divider">/</span>
            <Link
              href={`/projects/${projectId}/settings/general`}
              className="phase-product-link"
            >
              Settings
            </Link>
            <span className="phase-shell-divider">/</span>
            <span>Collaboration</span>
          </div>
          <div className="phase-shell-pill-row ml-auto flex-shrink-0">
            <span className="phase-shell-pill">Settings</span>
            <span className="phase-shell-pill phase-shell-pill-muted">
              Collaboration
            </span>
            {!isOwner && (
              <span className="phase-shell-pill phase-shell-pill-muted">
                Read-only
              </span>
            )}
          </div>
        </div>
        <div className="phase-shell-header-main">
          <div className="phase-shell-title-block">
            <h1 className="phase-shell-title">Collaboration</h1>
            <p className="phase-shell-helper">
              {isOwner
                ? "Manage team members and pending invitations for this project."
                : "View the team for this project. Contact an owner to change members or roles."}
            </p>
          </div>
        </div>
      </header>

      <nav aria-label="Settings" className="flex gap-1">
        <Link
          href={`/projects/${projectId}/settings/general`}
          className="phase-stage-link text-sm"
        >
          General
        </Link>
        <span
          aria-current="page"
          className="phase-stage-link phase-stage-link-active text-sm"
        >
          Collaboration
        </span>
      </nav>

      {loading ? (
        <div className="phase-empty-state p-8 text-center">
          <p className="phase-overline">Loading</p>
          <p className="mt-2 text-sm text-[color:var(--shell-muted)]">
            Loading collaboration data…
          </p>
        </div>
      ) : error ? (
        <div className="phase-feedback phase-feedback-error" role="alert">
          {error}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {actionFeedback ? (
            <div
              className={`phase-feedback ${
                actionFeedback.tone === "success"
                  ? "phase-feedback-success"
                  : "phase-feedback-error"
              }`}
              role={actionFeedback.tone === "error" ? "alert" : "status"}
            >
              {actionFeedback.message}
            </div>
          ) : null}

          {/* Members */}
          <section
            aria-labelledby="collab-members-heading"
            className="phase-section-card"
          >
            <div className="phase-section-copy">
              <h2
                className="phase-section-title"
                id="collab-members-heading"
              >
                Team members
              </h2>
              {!isOwner && (
                <p className="phase-section-body">
                  You have read-only access to the team list.
                </p>
              )}
            </div>

            {members.length === 0 ? (
              <p className="text-sm text-[color:var(--shell-muted)]">
                No members found.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table
                  aria-label="Team members"
                  className="w-full text-sm"
                >
                  <thead>
                    <tr className="border-b border-[color:var(--shell-border)]">
                      <th className="pb-2 pr-4 text-left font-medium text-[color:var(--shell-muted)]">
                        Member
                      </th>
                      <th className="pb-2 pr-4 text-left font-medium text-[color:var(--shell-muted)]">
                        Role
                      </th>
                      <th className="pb-2 pr-4 text-left font-medium text-[color:var(--shell-muted)]">
                        Joined
                      </th>
                      {isOwner && (
                        <th className="pb-2 text-right font-medium text-[color:var(--shell-muted)]">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => {
                      const isBusy = memberActionId === member.userId;
                      return (
                        <tr
                          key={member.userId}
                          className="border-b border-[color:var(--shell-border)] last:border-0"
                        >
                          <td className="py-3 pr-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium">
                                {displayName(member)}
                              </span>
                              {member.name && member.email && (
                                <span className="mono-label text-xs text-[color:var(--shell-muted)]">
                                  {member.email}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            {isOwner ? (
                              <select
                                aria-label={`Change role for ${displayName(member)}`}
                                disabled={isBusy}
                                value={member.role}
                                onChange={(e) =>
                                  onMemberRoleChange(
                                    member.userId,
                                    e.target.value as ProjectRole,
                                  )
                                }
                                className="focus-premium rounded-lg border border-[color:var(--shell-border)] bg-[color:var(--shell-surface-strong)] px-2 py-1 text-xs transition disabled:opacity-50"
                              >
                                {ROLES.map((r) => (
                                  <option key={r.value} value={r.value}>
                                    {r.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="mono-label text-xs">
                                {roleLabel(member.role)}
                              </span>
                            )}
                          </td>
                          <td className="py-3 pr-4 text-sm text-[color:var(--shell-muted)]">
                            {formatDate(member.joinedAt)}
                          </td>
                          {isOwner && (
                            <td className="py-3 text-right">
                              <button
                                type="button"
                                aria-label={`Remove ${displayName(member)}`}
                                disabled={isBusy}
                                onClick={() => onMemberRemove(member.userId)}
                                className="focus-premium theme-shell-button-secondary rounded-lg px-2.5 py-1 text-xs font-semibold transition disabled:opacity-50"
                              >
                                {isBusy ? "Removing…" : "Remove"}
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Non-owner limited view */}
          {!isOwner && (
            <div className="phase-feedback">
              You need owner access to invite collaborators or change roles.
              Contact an existing owner to make changes.
            </div>
          )}

          {/* Invite form — owners only */}
          {isOwner && (
            <section
              aria-labelledby="collab-invite-heading"
              className="phase-section-card"
            >
              <div className="phase-section-copy">
                <h2
                  className="phase-section-title"
                  id="collab-invite-heading"
                >
                  Invite a collaborator
                </h2>
                <p className="phase-section-body">
                  Send an invitation by email. The recipient will receive a
                  link to join this project.
                </p>
              </div>

              <form
                className="flex flex-wrap items-end gap-3"
                noValidate
                onSubmit={onInviteSubmit}
              >
                <div className="flex flex-col gap-1">
                  <label className="mono-label text-xs" htmlFor="collab-invite-email">
                    Email address
                  </label>
                  <input
                    aria-describedby={
                      inviteFieldError ? "collab-invite-email-error" : undefined
                    }
                    aria-invalid={!!inviteFieldError}
                    disabled={isSubmittingInvite}
                    id="collab-invite-email"
                    placeholder="collaborator@example.com"
                    required
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => onInviteEmailChange(e.target.value)}
                    className="focus-premium w-72 rounded-xl border border-[color:var(--shell-border)] bg-[color:var(--shell-surface-strong)] px-3 py-2 text-sm transition placeholder:text-[color:var(--shell-muted)] disabled:opacity-50"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="mono-label text-xs" htmlFor="collab-invite-role">
                    Role
                  </label>
                  <select
                    disabled={isSubmittingInvite}
                    id="collab-invite-role"
                    value={inviteRole}
                    onChange={(e) =>
                      onInviteRoleChange(e.target.value as ProjectRole)
                    }
                    className="focus-premium rounded-xl border border-[color:var(--shell-border)] bg-[color:var(--shell-surface-strong)] px-3 py-2 text-sm transition disabled:opacity-50"
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  disabled={isSubmittingInvite || !inviteEmail.trim()}
                  type="submit"
                  className="focus-premium theme-button-primary rounded-2xl px-5 py-2.5 text-sm font-semibold transition disabled:opacity-50"
                >
                  {isSubmittingInvite ? "Sending…" : "Send invite"}
                </button>
              </form>

              {inviteFieldError ? (
                <p
                  className="phase-feedback phase-feedback-error"
                  id="collab-invite-email-error"
                  role="alert"
                >
                  {inviteFieldError}
                </p>
              ) : null}
            </section>
          )}

          {/* Pending invites — owners only */}
          {isOwner && (
            <section
              aria-labelledby="collab-invites-heading"
              className="phase-section-card"
            >
              <div className="phase-section-copy">
                <h2
                  className="phase-section-title"
                  id="collab-invites-heading"
                >
                  Pending invites
                </h2>
              </div>

              {pendingInvites.length === 0 ? (
                <p className="text-sm text-[color:var(--shell-muted)]">
                  No pending invites.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table
                    aria-label="Pending invites"
                    className="w-full text-sm"
                  >
                    <thead>
                      <tr className="border-b border-[color:var(--shell-border)]">
                        <th className="pb-2 pr-4 text-left font-medium text-[color:var(--shell-muted)]">
                          Email
                        </th>
                        <th className="pb-2 pr-4 text-left font-medium text-[color:var(--shell-muted)]">
                          Role
                        </th>
                        <th className="pb-2 pr-4 text-left font-medium text-[color:var(--shell-muted)]">
                          Expires
                        </th>
                        <th className="pb-2 text-right font-medium text-[color:var(--shell-muted)]">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingInvites.map((invite) => {
                        const isBusy = inviteActionId === invite.id;
                        return (
                          <tr
                            key={invite.id}
                            className="border-b border-[color:var(--shell-border)] last:border-0"
                          >
                            <td className="py-3 pr-4 font-medium">
                              {invite.email}
                            </td>
                            <td className="py-3 pr-4">
                              <span className="mono-label text-xs">
                                {roleLabel(invite.role)}
                              </span>
                            </td>
                            <td className="py-3 pr-4 text-[color:var(--shell-muted)]">
                              {formatDate(invite.expiresAt)}
                            </td>
                            <td className="py-3">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  aria-label={`Resend invite to ${invite.email}`}
                                  disabled={isBusy}
                                  onClick={() => onInviteResend(invite.id)}
                                  className="focus-premium theme-shell-button-secondary rounded-lg px-2.5 py-1 text-xs font-semibold transition disabled:opacity-50"
                                >
                                  {isBusy ? "Working…" : "Resend"}
                                </button>
                                <button
                                  type="button"
                                  aria-label={`Revoke invite for ${invite.email}`}
                                  disabled={isBusy}
                                  onClick={() => onInviteRevoke(invite.id)}
                                  className="focus-premium theme-shell-button-secondary rounded-lg px-2.5 py-1 text-xs font-semibold transition disabled:opacity-50"
                                >
                                  {isBusy ? "Working…" : "Revoke"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export default function CollaborationSettings({
  isOwner,
  projectId,
}: {
  isOwner: boolean;
  projectId: string;
}) {
  const { project } = usePhase1Project();
  const projectName = project?.projectName ?? "Project";

  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [invites, setInvites] = useState<ProjectInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<ProjectRole>("editor");
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);
  const [inviteFieldError, setInviteFieldError] = useState<string | null>(null);

  const [memberActionId, setMemberActionId] = useState<string | null>(null);
  const [inviteActionId, setInviteActionId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback | null>(
    null,
  );

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [membersRes, invitesRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/members`),
        isOwner ? fetch(`/api/projects/${projectId}/invites`) : Promise.resolve(null),
      ]);

      if (!membersRes.ok) {
        const body = await membersRes.json().catch(() => null);
        setError(
          body?.error ?? "Failed to load team members. Please try again.",
        );
        return;
      }

      setMembers(await membersRes.json());

      if (invitesRes && invitesRes.ok) {
        setInvites(await invitesRes.json());
      }
    } catch {
      setError("Could not reach the server. Please reload the page.");
    } finally {
      setLoading(false);
    }
  }, [isOwner, projectId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const showFeedback = useCallback(
    (message: string, tone: "error" | "success") => {
      setActionFeedback({ message, tone });
      const timer = setTimeout(() => setActionFeedback(null), 5000);
      return () => clearTimeout(timer);
    },
    [],
  );

  const handleInviteSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const normalized = inviteEmail.trim().toLowerCase();

      if (!normalized) {
        setInviteFieldError("Email address is required.");
        return;
      }

      setInviteFieldError(null);
      setIsSubmittingInvite(true);

      try {
        const res = await fetch(`/api/projects/${projectId}/invites`, {
          body: JSON.stringify({ email: normalized, role: inviteRole }),
          headers: { "content-type": "application/json" },
          method: "POST",
        });

        const body = await res.json().catch(() => null);

        if (!res.ok) {
          setInviteFieldError(
            body?.error ?? "The invite could not be sent. Please try again.",
          );
          return;
        }

        setInviteEmail("");
        setInvites((prev) => [body as ProjectInvite, ...prev]);
        showFeedback(`Invite sent to ${normalized}.`, "success");
      } catch {
        setInviteFieldError("Could not reach the server. Please try again.");
      } finally {
        setIsSubmittingInvite(false);
      }
    },
    [inviteEmail, inviteRole, projectId, showFeedback],
  );

  const handleMemberRoleChange = useCallback(
    async (targetUserId: string, newRole: ProjectRole) => {
      setMemberActionId(targetUserId);

      try {
        const res = await fetch(
          `/api/projects/${projectId}/members/${targetUserId}`,
          {
            body: JSON.stringify({ role: newRole }),
            headers: { "content-type": "application/json" },
            method: "PATCH",
          },
        );

        const body = await res.json().catch(() => null);

        if (!res.ok) {
          showFeedback(
            body?.error ?? "Could not update role. Please try again.",
            "error",
          );
          return;
        }

        setMembers((prev) =>
          prev.map((m) =>
            m.userId === targetUserId
              ? { ...m, role: (body as ProjectMember).role }
              : m,
          ),
        );
        showFeedback("Role updated.", "success");
      } catch {
        showFeedback("Could not reach the server. Please try again.", "error");
      } finally {
        setMemberActionId(null);
      }
    },
    [projectId, showFeedback],
  );

  const handleMemberRemove = useCallback(
    async (targetUserId: string) => {
      setMemberActionId(targetUserId);

      try {
        const res = await fetch(
          `/api/projects/${projectId}/members/${targetUserId}`,
          { method: "DELETE" },
        );

        const body = await res.json().catch(() => null);

        if (!res.ok) {
          showFeedback(
            body?.error ?? "Could not remove member. Please try again.",
            "error",
          );
          return;
        }

        setMembers((prev) => prev.filter((m) => m.userId !== targetUserId));
        showFeedback("Member removed.", "success");
      } catch {
        showFeedback("Could not reach the server. Please try again.", "error");
      } finally {
        setMemberActionId(null);
      }
    },
    [projectId, showFeedback],
  );

  const handleInviteResend = useCallback(
    async (inviteId: string) => {
      setInviteActionId(inviteId);

      try {
        const res = await fetch(
          `/api/projects/${projectId}/invites/${inviteId}/resend`,
          { method: "POST" },
        );

        const body = await res.json().catch(() => null);

        if (!res.ok) {
          showFeedback(
            body?.error ?? "Could not resend invite. Please try again.",
            "error",
          );
          return;
        }

        showFeedback("Invite resent.", "success");
      } catch {
        showFeedback("Could not reach the server. Please try again.", "error");
      } finally {
        setInviteActionId(null);
      }
    },
    [projectId, showFeedback],
  );

  const handleInviteRevoke = useCallback(
    async (inviteId: string) => {
      setInviteActionId(inviteId);

      try {
        const res = await fetch(
          `/api/projects/${projectId}/invites/${inviteId}`,
          { method: "DELETE" },
        );

        const body = await res.json().catch(() => null);

        if (!res.ok) {
          showFeedback(
            body?.error ?? "Could not revoke invite. Please try again.",
            "error",
          );
          return;
        }

        setInvites((prev) =>
          prev.map((inv) =>
            inv.id === inviteId ? { ...inv, status: "revoked" } : inv,
          ),
        );
        showFeedback("Invite revoked.", "success");
      } catch {
        showFeedback("Could not reach the server. Please try again.", "error");
      } finally {
        setInviteActionId(null);
      }
    },
    [projectId, showFeedback],
  );

  return (
    <main className="app-canvas min-h-screen text-[color:var(--shell-ink)]">
      <Phase1Topbar />
      <CollaborationSettingsView
        actionFeedback={actionFeedback}
        error={error}
        inviteActionId={inviteActionId}
        inviteEmail={inviteEmail}
        inviteFieldError={inviteFieldError}
        inviteRole={inviteRole}
        invites={invites}
        isOwner={isOwner}
        isSubmittingInvite={isSubmittingInvite}
        loading={loading}
        memberActionId={memberActionId}
        members={members}
        projectId={projectId}
        projectName={projectName}
        onInviteEmailChange={setInviteEmail}
        onInviteResend={handleInviteResend}
        onInviteRevoke={handleInviteRevoke}
        onInviteRoleChange={setInviteRole}
        onInviteSubmit={handleInviteSubmit}
        onMemberRemove={handleMemberRemove}
        onMemberRoleChange={handleMemberRoleChange}
      />
    </main>
  );
}
