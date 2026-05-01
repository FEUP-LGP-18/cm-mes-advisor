import crypto from "node:crypto";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { requireProjectCapability, requireUser } from "./permissions.server";
import { recordProjectActivity } from "./repository.server";
import { sendInviteEmail } from "./email.server";
import {
  failure,
  success,
  type ProjectInvite,
  type ProjectResult,
  type ProjectRole,
} from "./types";

const INVITE_EXPIRY_DAYS = 7;

type ProjectInviteRow = {
  accepted_at: string | null;
  created_at: string;
  email: string;
  expires_at: string;
  id: string;
  invited_by: string | null;
  project_id: string;
  revoked_at: string | null;
  role: ProjectRole;
  status: ProjectInvite["status"];
  updated_at: string;
};

const inviteSelect =
  "id,project_id,email,role,status,invited_by,expires_at,accepted_at,revoked_at,created_at,updated_at";

function generateToken() {
  const token = crypto.randomBytes(32).toString("base64url");
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  return { hash, token };
}

function mapInviteRow(row: ProjectInviteRow): ProjectInvite {
  return {
    acceptedAt: row.accepted_at,
    createdAt: row.created_at,
    email: row.email,
    expiresAt: row.expires_at,
    id: row.id,
    invitedBy: row.invited_by,
    projectId: row.project_id,
    revokedAt: row.revoked_at,
    role: row.role,
    status: row.status,
    updatedAt: row.updated_at,
  };
}

export async function createInvite(
  projectId: string,
  email: string,
  role: ProjectRole,
  appUrl: string,
): Promise<ProjectResult<ProjectInvite>> {
  const userResult = await requireUser();
  if (!userResult.ok) {
    return userResult;
  }
  const userId = userResult.data.id;

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return failure("validation_error", "Valid email is required.");
  }

  const accessResult = await requireProjectCapability(
    projectId,
    "manage_project_members",
  );
  if (!accessResult.ok) {
    return accessResult;
  }
  if (accessResult.data.id !== userId) {
    return failure("forbidden", "Cannot access data for another user.");
  }

  const supabase = await createClient();

  // Check if a pending invite already exists for this email
  const existingResult = await supabase
    .from("project_invites")
    .select(inviteSelect)
    .eq("project_id", projectId)
    .eq("email", normalizedEmail)
    .eq("status", "pending")
    .maybeSingle();

  if (existingResult.error) {
    return failure("conflict", "Could not verify existing invites.");
  }

  if (existingResult.data) {
    return failure("conflict", "A pending invite already exists for this email.");
  }

  const { hash, token } = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

  const { data, error } = await supabase
    .from("project_invites")
    .insert({
      email: normalizedEmail,
      expires_at: expiresAt.toISOString(),
      invited_by: userId,
      project_id: projectId,
      role,
      token_hash: hash,
    })
    .select(inviteSelect)
    .single();

  if (error) {
    return failure("validation_error", "Failed to create invite.");
  }

  const inviteUrl = `${appUrl}/invites/${token}`;
  await sendInviteEmail(normalizedEmail, inviteUrl);

  return success(mapInviteRow(data as ProjectInviteRow));
}

export async function revokeInvite(
  inviteId: string,
  projectId: string,
): Promise<ProjectResult<ProjectInvite>> {
  const userResult = await requireUser();
  if (!userResult.ok) {
    return userResult;
  }
  const userId = userResult.data.id;

  const accessResult = await requireProjectCapability(
    projectId,
    "manage_project_members",
  );
  if (!accessResult.ok) {
    return accessResult;
  }
  if (accessResult.data.id !== userId) {
    return failure("forbidden", "Cannot access data for another user.");
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("project_invites")
    .update({
      revoked_at: new Date().toISOString(),
      status: "revoked",
    })
    .eq("id", inviteId)
    .eq("project_id", projectId)
    .eq("status", "pending")
    .select(inviteSelect)
    .maybeSingle();

  if (error || !data) {
    return failure("not_found", "Active invite not found.");
  }

  return success(mapInviteRow(data as ProjectInviteRow));
}

export async function resendInvite(
  inviteId: string,
  projectId: string,
  appUrl: string,
): Promise<ProjectResult<ProjectInvite>> {
  const userResult = await requireUser();
  if (!userResult.ok) {
    return userResult;
  }
  const userId = userResult.data.id;

  const accessResult = await requireProjectCapability(
    projectId,
    "manage_project_members",
  );
  if (!accessResult.ok) {
    return accessResult;
  }
  if (accessResult.data.id !== userId) {
    return failure("forbidden", "Cannot access data for another user.");
  }

  const supabase = await createClient();

  // Find the existing pending invite
  const { data: existingInvite, error: fetchError } = await supabase
    .from("project_invites")
    .select(inviteSelect)
    .eq("id", inviteId)
    .eq("project_id", projectId)
    .eq("status", "pending")
    .maybeSingle();

  if (fetchError || !existingInvite) {
    return failure("not_found", "Active invite not found.");
  }

  const { hash, token } = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

  const { data, error } = await supabase
    .from("project_invites")
    .update({
      expires_at: expiresAt.toISOString(),
      token_hash: hash,
      updated_at: new Date().toISOString(),
    })
    .eq("id", inviteId)
    .eq("project_id", projectId)
    .eq("status", "pending")
    .select(inviteSelect)
    .single();

  if (error) {
    return failure("validation_error", "Failed to resend invite.");
  }

  const inviteUrl = `${appUrl}/invites/${token}`;
  await sendInviteEmail(existingInvite.email, inviteUrl);

  return success(mapInviteRow(data as ProjectInviteRow));
}

export async function getInviteDetails(
  token: string,
): Promise<ProjectResult<ProjectInvite>> {
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const supabase = await createClient();

  const { data: invite, error } = await supabase
    .from("project_invites")
    .select(inviteSelect)
    .eq("token_hash", hash)
    .maybeSingle();

  if (error || !invite) {
    return failure("not_found", "Invalid or expired invite token.");
  }

  if (invite.status !== "pending") {
    return failure("forbidden", "Invite is no longer active.");
  }

  if (new Date(invite.expires_at) < new Date()) {
    return failure("forbidden", "Invite has expired.");
  }

  return success(mapInviteRow(invite as ProjectInviteRow));
}

export async function acceptInvite(
  token: string,
): Promise<ProjectResult<ProjectInvite>> {
  const userResult = await requireUser();
  if (!userResult.ok) {
    return userResult;
  }
  const user = userResult.data;

  if (!user.email) {
    return failure("forbidden", "User email is required to accept invites.");
  }

  if (!user.emailConfirmedAt) {
    return failure("forbidden", "You must confirm your email address before accepting an invite.");
  }

  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const adminClient = await createAdminClient();

  // Find the invite
  const { data: invite, error } = await adminClient
    .from("project_invites")
    .select(inviteSelect)
    .eq("token_hash", hash)
    .maybeSingle();

  if (error || !invite) {
    return failure("not_found", "Invalid or expired invite token.");
  }

  if (invite.status !== "pending") {
    return failure("forbidden", "Invite is no longer active.");
  }

  if (new Date(invite.expires_at) < new Date()) {
    // Mark as expired (lazy update)
    await adminClient
      .from("project_invites")
      .update({ status: "expired" })
      .eq("id", invite.id);
    return failure("forbidden", "Invite has expired.");
  }

  if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
    return failure(
      "forbidden",
      "This invite was sent to a different email address.",
    );
  }

  // We use the admin client to bypass RLS because the user is not yet a member
  // Use upsert to allow role upgrades if they are already a member (e.g. Viewer -> Owner)
  const { error: membershipError } = await adminClient
    .from("project_memberships")
    .upsert(
      {
        project_id: invite.project_id,
        user_id: user.id,
        role: invite.role,
        invited_by: invite.invited_by,
      },
      { onConflict: "project_id, user_id" }
    );

  if (membershipError) {
     console.error("Membership upsert error:", membershipError);
     return failure("conflict", "Could not join or update project role.");
  }

  // Mark invite as accepted atomically to prevent race conditions
  const { data: updatedInvite, error: updateError } = await adminClient
    .from("project_invites")
    .update({
      accepted_at: new Date().toISOString(),
      status: "accepted",
    })
    .eq("id", invite.id)
    .eq("status", "pending")
    .select(inviteSelect)
    .maybeSingle();

  if (updateError) {
    return failure("validation_error", "Failed to accept invite.");
  }

  if (!updatedInvite) {
    return failure("conflict", "Invite has already been processed or is no longer pending.");
  }

  // Record activity (using admin client to ensure it writes even if RLS is strict on new members)
  const { error: activityError } = await adminClient
    .from("project_activity_events")
    .insert({
      actor_id: user.id,
      event_payload: { role: invite.role },
      event_type: "user_joined",
      project_id: invite.project_id,
    });
    
  if (activityError) {
    console.error("Activity insert error:", activityError);
  }

  return success(mapInviteRow(updatedInvite as ProjectInviteRow));
}
