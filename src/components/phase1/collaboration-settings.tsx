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
  return new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
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
  isServerBacked: boolean;
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
  isServerBacked,
  isSubmittingInvite,
  loading,
  memberActionId,
  members,
  projectId,
  projectName: _projectName,
  onInviteEmailChange,
  onInviteResend,
  onInviteRevoke,
  onInviteRoleChange,
  onInviteSubmit,
  onMemberRemove,
  onMemberRoleChange,
}: CollaborationSettingsViewProps) {
  const pendingInvites = invites.filter((inv) => inv.status === "pending");

  if (loading) {
    return (
      <div className="fv-card" style={{ textAlign: "center", padding: "2rem" }}>
        <p style={{ fontSize: "0.875rem", color: "var(--muted-fg)" }}>Loading collaboration data…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fv-callout fv-callout-error" role="alert">{error}</div>
    );
  }

  if (!isServerBacked) {
    return (
      <section className="fv-card" aria-labelledby="collab-local-heading">
        <div className="fv-card-title" id="collab-local-heading" style={{ marginBottom: "0.5rem" }}>
          Collaboration unavailable in local mode
        </div>
        <p style={{ fontSize: "0.875rem", color: "var(--muted-fg)", margin: 0 }}>
          Local sample projects do not manage real members or invitations. Configure Supabase to enable owner, editor, and viewer access.
        </p>
      </section>
    );
  }

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      {actionFeedback ? (
        <div
          className={`fv-callout ${actionFeedback.tone === "success" ? "fv-callout-success" : "fv-callout-error"}`}
          role={actionFeedback.tone === "error" ? "alert" : "status"}
        >
          {actionFeedback.message}
        </div>
      ) : null}

      {/* Team members */}
      <section aria-labelledby="collab-members-heading" className="fv-card">
        <div className="fv-card-title" id="collab-members-heading" style={{ marginBottom: "1rem" }}>
          Team members
        </div>
        {!isOwner && (
          <p style={{ fontSize: "0.8rem", color: "var(--muted-fg)", margin: "0 0 0.75rem" }}>
            You have read-only access to the team list.
          </p>
        )}

        {members.length === 0 ? (
          <p style={{ fontSize: "0.875rem", color: "var(--muted-fg)" }}>No members found.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table aria-label="Team members" style={{ width: "100%", fontSize: "0.875rem", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--surface-border)" }}>
                  {["Member", "Role", "Joined", isOwner ? "Actions" : null].filter(Boolean).map((h) => (
                    <th key={h} style={{ paddingBottom: "0.5rem", paddingRight: "1rem", textAlign: h === "Actions" ? "right" : "left", fontWeight: 600, color: "var(--muted-fg)", fontSize: "0.75rem", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const isBusy = memberActionId === member.userId;
                  return (
                    <tr key={member.userId} style={{ borderBottom: "1px solid var(--surface-border)" }}>
                      <td style={{ padding: "0.75rem 1rem 0.75rem 0" }}>
                        <div style={{ display: "grid", gap: "0.125rem" }}>
                          <span style={{ fontWeight: 600 }}>{displayName(member)}</span>
                          {member.name && member.email && (
                            <span style={{ fontSize: "0.75rem", color: "var(--muted-fg)" }}>{member.email}</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: "0.75rem 1rem 0.75rem 0" }}>
                        {isOwner ? (
                          <select
                            aria-label={`Change role for ${displayName(member)}`}
                            disabled={isBusy}
                            value={member.role}
                            onChange={(e) => onMemberRoleChange(member.userId, e.target.value as ProjectRole)}
                            className="fv-input"
                            style={{ width: "auto", padding: "0.25rem 0.5rem", fontSize: "0.8rem" }}
                          >
                            {ROLES.map((r) => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </select>
                        ) : (
                          <span style={{ fontSize: "0.8rem", color: "var(--muted-fg)" }}>{roleLabel(member.role)}</span>
                        )}
                      </td>
                      <td style={{ padding: "0.75rem 1rem 0.75rem 0", color: "var(--muted-fg)", fontSize: "0.8rem" }}>
                        {formatDate(member.joinedAt)}
                      </td>
                      {isOwner && (
                        <td style={{ padding: "0.75rem 0", textAlign: "right" }}>
                          <button
                            type="button"
                            aria-label={`Remove ${displayName(member)}`}
                            disabled={isBusy}
                            onClick={() => onMemberRemove(member.userId)}
                            className="fv-btn-secondary"
                            style={{ fontSize: "0.75rem", padding: "0.25rem 0.625rem" }}
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

      {!isOwner && (
        <div className="fv-callout">
          You need owner access to invite collaborators or change roles. Contact an existing owner to make changes.
        </div>
      )}

      {/* Invite form */}
      {isOwner && (
        <section aria-labelledby="collab-invite-heading" className="fv-card">
          <div className="fv-card-title" id="collab-invite-heading" style={{ marginBottom: "0.25rem" }}>
            Invite a collaborator
          </div>
          <p style={{ fontSize: "0.8rem", color: "var(--muted-fg)", margin: "0 0 1rem" }}>
            Send an invitation by email. The recipient will receive a link to join this project.
          </p>

          <form style={{ display: "flex", flexWrap: "wrap", alignItems: "end", gap: "0.75rem" }} noValidate onSubmit={onInviteSubmit}>
            <div style={{ display: "grid", gap: "0.3rem" }}>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--muted-fg)", letterSpacing: "0.04em" }} htmlFor="collab-invite-email">
                Email address
              </label>
              <input
                aria-describedby={inviteFieldError ? "collab-invite-email-error" : undefined}
                aria-invalid={!!inviteFieldError}
                disabled={isSubmittingInvite}
                id="collab-invite-email"
                placeholder="collaborator@example.com"
                required
                type="email"
                value={inviteEmail}
                onChange={(e) => onInviteEmailChange(e.target.value)}
                className="fv-input"
                style={{ width: "280px" }}
              />
            </div>

            <div style={{ display: "grid", gap: "0.3rem" }}>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--muted-fg)", letterSpacing: "0.04em" }} htmlFor="collab-invite-role">
                Role
              </label>
              <select
                disabled={isSubmittingInvite}
                id="collab-invite-role"
                value={inviteRole}
                onChange={(e) => onInviteRoleChange(e.target.value as ProjectRole)}
                className="fv-input"
                style={{ width: "auto" }}
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <button disabled={isSubmittingInvite || !inviteEmail.trim()} type="submit" className="fv-btn-primary">
              {isSubmittingInvite ? "Sending…" : "Send invite"}
            </button>
          </form>

          {inviteFieldError ? (
            <p className="fv-callout fv-callout-error" id="collab-invite-email-error" role="alert" style={{ marginTop: "0.75rem" }}>
              {inviteFieldError}
            </p>
          ) : null}
        </section>
      )}

      {/* Pending invites */}
      {isOwner && (
        <section aria-labelledby="collab-invites-heading" className="fv-card">
          <div className="fv-card-title" id="collab-invites-heading" style={{ marginBottom: "1rem" }}>
            Pending invites
          </div>

          {pendingInvites.length === 0 ? (
            <p style={{ fontSize: "0.875rem", color: "var(--muted-fg)" }}>No pending invites.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table aria-label="Pending invites" style={{ width: "100%", fontSize: "0.875rem", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--surface-border)" }}>
                    {["Email", "Role", "Expires", "Actions"].map((h) => (
                      <th key={h} style={{ paddingBottom: "0.5rem", paddingRight: "1rem", textAlign: h === "Actions" ? "right" : "left", fontWeight: 600, color: "var(--muted-fg)", fontSize: "0.75rem", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pendingInvites.map((invite) => {
                    const isBusy = inviteActionId === invite.id;
                    return (
                      <tr key={invite.id} style={{ borderBottom: "1px solid var(--surface-border)" }}>
                        <td style={{ padding: "0.75rem 1rem 0.75rem 0", fontWeight: 600 }}>{invite.email}</td>
                        <td style={{ padding: "0.75rem 1rem 0.75rem 0" }}>
                          <span style={{ fontSize: "0.8rem", color: "var(--muted-fg)" }}>{roleLabel(invite.role)}</span>
                        </td>
                        <td style={{ padding: "0.75rem 1rem 0.75rem 0", color: "var(--muted-fg)", fontSize: "0.8rem" }}>
                          {formatDate(invite.expiresAt)}
                        </td>
                        <td style={{ padding: "0.75rem 0", textAlign: "right" }}>
                          <div style={{ display: "flex", justifyContent: "end", gap: "0.5rem" }}>
                            <button
                              type="button"
                              aria-label={`Resend invite to ${invite.email}`}
                              disabled={isBusy}
                              onClick={() => onInviteResend(invite.id)}
                              className="fv-btn-secondary"
                              style={{ fontSize: "0.75rem", padding: "0.25rem 0.625rem" }}
                            >
                              {isBusy ? "Working…" : "Resend"}
                            </button>
                            <button
                              type="button"
                              aria-label={`Revoke invite for ${invite.email}`}
                              disabled={isBusy}
                              onClick={() => onInviteRevoke(invite.id)}
                              className="fv-btn-secondary"
                              style={{ fontSize: "0.75rem", padding: "0.25rem 0.625rem" }}
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
  );
}

export default function CollaborationSettings({
  isOwner,
  isServerBacked,
  projectId,
}: {
  isOwner: boolean;
  isServerBacked: boolean;
  projectId: string;
}) {
  const { project } = usePhase1Project();
  const projectName = project?.projectName ?? "Project";

  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [invites, setInvites] = useState<ProjectInvite[]>([]);
  const [loading, setLoading] = useState(isServerBacked);
  const [error, setError] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<ProjectRole>("editor");
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);
  const [inviteFieldError, setInviteFieldError] = useState<string | null>(null);

  const [memberActionId, setMemberActionId] = useState<string | null>(null);
  const [inviteActionId, setInviteActionId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback | null>(null);

  const loadData = useCallback(async () => {
    if (!isServerBacked) {
      setMembers([]); setInvites([]); setError(null); setLoading(false);
      return;
    }
    try {
      setLoading(true); setError(null);
      const [membersRes, invitesRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/members`),
        isOwner ? fetch(`/api/projects/${projectId}/invites`) : Promise.resolve(null),
      ]);
      if (!membersRes.ok) {
        const body = await membersRes.json().catch(() => null);
        setError(body?.error ?? "Failed to load team members. Please try again.");
        return;
      }
      setMembers(await membersRes.json());
      if (invitesRes && invitesRes.ok) setInvites(await invitesRes.json());
    } catch {
      setError("Could not reach the server. Please reload the page.");
    } finally {
      setLoading(false);
    }
  }, [isOwner, isServerBacked, projectId]);

  useEffect(() => { void loadData(); }, [loadData]);

  const showFeedback = useCallback((message: string, tone: "error" | "success") => {
    setActionFeedback({ message, tone });
    const timer = setTimeout(() => setActionFeedback(null), 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleInviteSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = inviteEmail.trim().toLowerCase();
    if (!normalized) { setInviteFieldError("Email address is required."); return; }
    setInviteFieldError(null);
    setIsSubmittingInvite(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/invites`, { body: JSON.stringify({ email: normalized, role: inviteRole }), headers: { "content-type": "application/json" }, method: "POST" });
      const body = await res.json().catch(() => null);
      if (!res.ok) { setInviteFieldError(body?.error ?? "The invite could not be sent. Please try again."); return; }
      setInviteEmail("");
      setInvites((prev) => [body as ProjectInvite, ...prev]);
      showFeedback(`Invite sent to ${normalized}.`, "success");
    } catch {
      setInviteFieldError("Could not reach the server. Please try again.");
    } finally {
      setIsSubmittingInvite(false);
    }
  }, [inviteEmail, inviteRole, projectId, showFeedback]);

  const handleMemberRoleChange = useCallback(async (targetUserId: string, newRole: ProjectRole) => {
    setMemberActionId(targetUserId);
    try {
      const res = await fetch(`/api/projects/${projectId}/members/${targetUserId}`, { body: JSON.stringify({ role: newRole }), headers: { "content-type": "application/json" }, method: "PATCH" });
      const body = await res.json().catch(() => null);
      if (!res.ok) { showFeedback(body?.error ?? "Could not update role. Please try again.", "error"); return; }
      setMembers((prev) => prev.map((m) => m.userId === targetUserId ? { ...m, role: (body as ProjectMember).role } : m));
      showFeedback("Role updated.", "success");
    } catch { showFeedback("Could not reach the server. Please try again.", "error"); } finally { setMemberActionId(null); }
  }, [projectId, showFeedback]);

  const handleMemberRemove = useCallback(async (targetUserId: string) => {
    setMemberActionId(targetUserId);
    try {
      const res = await fetch(`/api/projects/${projectId}/members/${targetUserId}`, { method: "DELETE" });
      const body = await res.json().catch(() => null);
      if (!res.ok) { showFeedback(body?.error ?? "Could not remove member. Please try again.", "error"); return; }
      setMembers((prev) => prev.filter((m) => m.userId !== targetUserId));
      showFeedback("Member removed.", "success");
    } catch { showFeedback("Could not reach the server. Please try again.", "error"); } finally { setMemberActionId(null); }
  }, [projectId, showFeedback]);

  const handleInviteResend = useCallback(async (inviteId: string) => {
    setInviteActionId(inviteId);
    try {
      const res = await fetch(`/api/projects/${projectId}/invites/${inviteId}/resend`, { method: "POST" });
      const body = await res.json().catch(() => null);
      if (!res.ok) { showFeedback(body?.error ?? "Could not resend invite. Please try again.", "error"); return; }
      showFeedback("Invite resent.", "success");
    } catch { showFeedback("Could not reach the server. Please try again.", "error"); } finally { setInviteActionId(null); }
  }, [projectId, showFeedback]);

  const handleInviteRevoke = useCallback(async (inviteId: string) => {
    setInviteActionId(inviteId);
    try {
      const res = await fetch(`/api/projects/${projectId}/invites/${inviteId}`, { method: "DELETE" });
      const body = await res.json().catch(() => null);
      if (!res.ok) { showFeedback(body?.error ?? "Could not revoke invite. Please try again.", "error"); return; }
      setInvites((prev) => prev.map((inv) => inv.id === inviteId ? { ...inv, status: "revoked" } : inv));
      showFeedback("Invite revoked.", "success");
    } catch { showFeedback("Could not reach the server. Please try again.", "error"); } finally { setInviteActionId(null); }
  }, [projectId, showFeedback]);

  return (
    <div className="fv-shell">
      <Phase1Topbar email={undefined} projectId={projectId.slice(0, 8).toUpperCase()} />
      <div className="fv-body">
        {/* Sidebar */}
        <nav className="fv-sidebar" aria-label="Settings navigation">
          <div className="fv-sidebar-section">
            <span className="fv-sidebar-label">Current Project</span>
            <span className="fv-sidebar-project-name">{projectName}</span>
          </div>
          <div className="fv-sidebar-section">
            <span className="fv-sidebar-label">Navigation</span>
            <Link href="/" className="fv-nav-item">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <rect x="2" y="2" width="5" height="5" rx="1" />
                <rect x="9" y="2" width="5" height="5" rx="1" />
                <rect x="2" y="9" width="5" height="5" rx="1" />
                <rect x="9" y="9" width="5" height="5" rx="1" />
              </svg>
              Projects
            </Link>
            <Link href={`/projects/${projectId}`} className="fv-nav-item">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M8 2v8M5 7l3 3 3-3" />
                <path d="M3 12h10" />
              </svg>
              Workflow
            </Link>
            <Link href={`/projects/${projectId}/settings/general`} className="fv-nav-item">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <circle cx="8" cy="8" r="2.5" />
                <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.2 3.2l1.4 1.4M11.4 11.4l1.4 1.4M11.4 3.2l-1.4 1.4M3.2 11.4l1.4-1.4" />
              </svg>
              Settings
            </Link>
            <span className="fv-nav-item fv-nav-item-active" aria-current="page">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <circle cx="5.5" cy="5" r="2" />
                <circle cx="10.5" cy="5" r="2" />
                <path d="M2 13c0-2 1.6-3 3.5-3s3.5 1 3.5 3" />
                <path d="M10.5 10c1.8 0 3.5 1 3.5 3" />
              </svg>
              Collaboration
            </span>
          </div>
        </nav>

        {/* Main content */}
        <main className="fv-content" id="main-content">
          <div className="fv-page">
            <nav className="fv-breadcrumb" aria-label="Breadcrumb" style={{ marginBottom: "1.25rem" }}>
              <Link href="/" className="fv-breadcrumb-link">Projects</Link>
              <span className="fv-breadcrumb-sep">/</span>
              <Link href={`/projects/${projectId}`} className="fv-breadcrumb-link">{projectName}</Link>
              <span className="fv-breadcrumb-sep">/</span>
              <Link href={`/projects/${projectId}/settings/general`} className="fv-breadcrumb-link">Settings</Link>
              <span className="fv-breadcrumb-sep">/</span>
              <span>Collaboration</span>
            </nav>

            <nav
              aria-label="Settings sections"
              style={{ display: "flex", borderBottom: "1px solid var(--surface-border)", marginBottom: "1.5rem" }}
            >
              {[
                { label: "Industry Templates", href: `/projects/${projectId}/settings/general?tab=templates` },
                { label: "General", href: `/projects/${projectId}/settings/general` },
                { label: "AI Configuration", href: `/projects/${projectId}/settings/general?tab=ai` },
                { label: "About", href: `/projects/${projectId}/settings/general?tab=about` },
                { label: "Collaboration", active: true },
              ].map((tab) => (
                tab.active ? (
                  <span
                    key="collab"
                    aria-current="page"
                    style={{ padding: "0.625rem 1.125rem", fontSize: "0.85rem", fontWeight: 700, color: "var(--brand-primary)", borderBottom: "2px solid var(--brand-primary)", marginBottom: "-1px", whiteSpace: "nowrap" }}
                  >
                    {tab.label}
                  </span>
                ) : (
                  <Link
                    key={tab.href}
                    href={tab.href!}
                    style={{ padding: "0.625rem 1.125rem", fontSize: "0.85rem", fontWeight: 500, color: "var(--muted-fg)", borderBottom: "2px solid transparent", marginBottom: "-1px", textDecoration: "none", whiteSpace: "nowrap" }}
                  >
                    {tab.label}
                  </Link>
                )
              ))}
            </nav>

            <CollaborationSettingsView
              actionFeedback={actionFeedback}
              error={error}
              inviteActionId={inviteActionId}
              inviteEmail={inviteEmail}
              inviteFieldError={inviteFieldError}
              inviteRole={inviteRole}
              invites={invites}
              isOwner={isOwner}
              isServerBacked={isServerBacked}
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
          </div>
        </main>
      </div>
    </div>
  );
}
