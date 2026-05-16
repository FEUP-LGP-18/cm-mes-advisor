import { createClient } from "@/lib/supabase/server";
import { requireUser } from "./permissions.server";
import {
  failure,
  success,
  type CurrentUser,
  type CurrentUserProfile,
  type ProjectResult,
} from "./types";

type ProfileRow = {
  display_name: string | null;
  email: string;
  id: string;
  updated_at?: string | null;
};

type SupabaseError = {
  code?: string;
  message?: string;
};

const profileSelect = "id,email,display_name,updated_at";
const MAX_DISPLAY_NAME_LENGTH = 120;

export async function getCurrentProfile(): Promise<
  ProjectResult<CurrentUserProfile>
> {
  const userResult = await requireUser();
  if (!userResult.ok) {
    return userResult;
  }

  const supabase = await createClient();
  const existing = await supabase
    .from("profiles")
    .select(profileSelect)
    .eq("id", userResult.data.id)
    .maybeSingle();

  if (existing.error) {
    return mapSupabaseError(existing.error, "Profile could not be loaded.");
  }

  if (existing.data) {
    return success(mapProfileRow(existing.data as ProfileRow, userResult.data));
  }

  const inserted = await supabase
    .from("profiles")
    .upsert(
      {
        display_name: null,
        email: userResult.data.email ?? "",
        id: userResult.data.id,
      },
      { onConflict: "id" },
    )
    .select(profileSelect)
    .single();

  if (inserted.error) {
    return mapSupabaseError(inserted.error, "Profile could not be created.");
  }

  return success(mapProfileRow(inserted.data as ProfileRow, userResult.data));
}

export async function updateCurrentProfile(
  displayName: string,
): Promise<ProjectResult<CurrentUserProfile>> {
  const userResult = await requireUser();
  if (!userResult.ok) {
    return userResult;
  }

  const parsedDisplayName = parseDisplayName(displayName);
  if (!parsedDisplayName.ok) {
    return parsedDisplayName;
  }

  const supabase = await createClient();
  const updated = await supabase
    .from("profiles")
    .upsert(
      {
        id: userResult.data.id,
        display_name: parsedDisplayName.data,
        email: userResult.data.email ?? "",
      },
      { onConflict: "id" },
    )
    .select(profileSelect)
    .single();

  if (updated.error) {
    return mapSupabaseError(updated.error, "Profile could not be updated.");
  }

  return success(mapProfileRow(updated.data as ProfileRow, userResult.data));
}

function parseDisplayName(
  displayName: string,
): ProjectResult<string | null> {
  const trimmed = displayName.trim();

  if (trimmed.length > MAX_DISPLAY_NAME_LENGTH) {
    return failure(
      "validation_error",
      `Display name must be ${MAX_DISPLAY_NAME_LENGTH} characters or fewer.`,
    );
  }

  return success(trimmed.length > 0 ? trimmed : null);
}

function mapProfileRow(
  row: ProfileRow,
  user: CurrentUser,
): CurrentUserProfile {
  return {
    ...user,
    email: row.email || user.email,
    name: row.display_name,
  };
}

function mapSupabaseError(error: SupabaseError, fallbackMessage: string) {
  if (error.code === "42501") {
    return failure("forbidden", fallbackMessage);
  }

  if (error.code === "PGRST116") {
    return failure("not_found", fallbackMessage);
  }

  if (error.code?.startsWith("23")) {
    return failure("validation_error", fallbackMessage);
  }

  return failure("internal_error", fallbackMessage);
}
