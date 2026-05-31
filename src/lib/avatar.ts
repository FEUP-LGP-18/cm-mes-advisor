export const AVATAR_COLORS = [
  "#2563eb", "#7c3aed", "#db2777", "#dc2626",
  "#ea580c", "#16a34a", "#0891b2", "#9333ea",
];

export const AVATAR_COLOR_KEY = "mes-advisor:avatar-color";
export const DISPLAY_NAME_KEY = "mes-advisor:display-name";
export const ACTIVE_PROFILE_EMAIL_KEY = "mes-advisor:active-profile-email";

export function getInitials(email?: string | null): string {
  if (!email) return "U";
  const localPart = email.includes("@") ? email.split("@")[0] : email.trim();
  const parts = localPart.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0] ?? localPart).slice(0, 2).toUpperCase() || "U";
}

export function getDisplayName(email?: string | null): string {
  if (!email) return "User";
  return email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getDefaultAvatarColor(email?: string | null): string {
  if (!email) return AVATAR_COLORS[0];
  const hash = email.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function getSavedAvatarColor(email?: string | null): string {
  const profileEmail = resolvePreferenceEmail(email);
  const fallback = getDefaultAvatarColor(profileEmail ?? email);
  if (!profileEmail) return fallback;

  const savedColor = readStorage(scopedPreferenceKey(AVATAR_COLOR_KEY, profileEmail));
  return savedColor && AVATAR_COLORS.includes(savedColor) ? savedColor : fallback;
}

export function getSavedDisplayName(email?: string | null): string | null {
  const profileEmail = resolvePreferenceEmail(email);
  if (!profileEmail) return null;

  const savedName = readStorage(scopedPreferenceKey(DISPLAY_NAME_KEY, profileEmail));
  return savedName?.trim() || null;
}

export function rememberProfileEmail(email?: string | null): void {
  const profileEmail = normalizeEmail(email);
  if (!profileEmail) return;
  writeStorage(ACTIVE_PROFILE_EMAIL_KEY, profileEmail);
}

export function clearActiveProfileEmail(): void {
  removeStorage(ACTIVE_PROFILE_EMAIL_KEY);
}

export function saveProfilePreferences(
  email: string | null | undefined,
  displayName: string | null | undefined,
  avatarColor: string,
): void {
  const profileEmail = normalizeEmail(email);
  if (!profileEmail) return;

  rememberProfileEmail(profileEmail);

  if (AVATAR_COLORS.includes(avatarColor)) {
    writeStorage(scopedPreferenceKey(AVATAR_COLOR_KEY, profileEmail), avatarColor);
  } else {
    removeStorage(scopedPreferenceKey(AVATAR_COLOR_KEY, profileEmail));
  }

  const normalizedDisplayName = displayName?.trim();
  if (normalizedDisplayName) {
    writeStorage(scopedPreferenceKey(DISPLAY_NAME_KEY, profileEmail), normalizedDisplayName);
  } else {
    removeStorage(scopedPreferenceKey(DISPLAY_NAME_KEY, profileEmail));
  }

  removeStorage(AVATAR_COLOR_KEY);
  removeStorage(DISPLAY_NAME_KEY);
}

function resolvePreferenceEmail(email?: string | null): string | null {
  return normalizeEmail(email) ?? normalizeEmail(readStorage(ACTIVE_PROFILE_EMAIL_KEY));
}

function normalizeEmail(email?: string | null): string | null {
  const normalized = email?.trim().toLowerCase();
  return normalized || null;
}

function scopedPreferenceKey(baseKey: string, email: string): string {
  return `${baseKey}:${email}`;
}

function readStorage(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Browser storage is optional for this local preference.
  }
}

function removeStorage(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Browser storage is optional for this local preference.
  }
}
