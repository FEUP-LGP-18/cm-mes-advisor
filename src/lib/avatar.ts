export const AVATAR_COLORS = [
  "#2563eb", "#7c3aed", "#db2777", "#dc2626",
  "#ea580c", "#16a34a", "#0891b2", "#9333ea",
];

export const AVATAR_COLOR_KEY = "mes-advisor:avatar-color";
export const DISPLAY_NAME_KEY = "mes-advisor:display-name";

export function getInitials(email?: string | null): string {
  if (!email) return "U";
  const parts = email.split("@")[0].split(/[._-]/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return email.slice(0, 2).toUpperCase();
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
  if (typeof window === "undefined") return getDefaultAvatarColor(email);
  return localStorage.getItem(AVATAR_COLOR_KEY) ?? getDefaultAvatarColor(email);
}
