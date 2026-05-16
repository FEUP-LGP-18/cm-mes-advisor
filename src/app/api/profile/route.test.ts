import { afterEach, describe, expect, it, vi } from "vitest";
import { getCurrentProfile, updateCurrentProfile } from "@/lib/projects/profile.server";
import { GET, PATCH } from "./route";

vi.mock("@/lib/supabase/config", () => ({
  isSupabaseConfigured: () => true,
}));

vi.mock("@/lib/projects/profile.server", () => ({
  getCurrentProfile: vi.fn(),
  updateCurrentProfile: vi.fn(),
}));

const getCurrentProfileMock = vi.mocked(getCurrentProfile);
const updateCurrentProfileMock = vi.mocked(updateCurrentProfile);

function makePatchRequest(body: unknown) {
  return new Request("http://localhost/api/profile", {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });
}

describe("/api/profile", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns the persisted current profile", async () => {
    getCurrentProfileMock.mockResolvedValueOnce({
      data: {
        email: "owner@example.com",
        emailConfirmedAt: "2026-05-01T12:00:00.000Z",
        id: "11111111-1111-4111-8111-111111111111",
        name: "Owner User",
      },
      ok: true,
      status: "success",
    });

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      email: "owner@example.com",
      name: "Owner User",
    });
  });

  it("updates the current user's display name", async () => {
    updateCurrentProfileMock.mockResolvedValueOnce({
      data: {
        email: "owner@example.com",
        emailConfirmedAt: "2026-05-01T12:00:00.000Z",
        id: "11111111-1111-4111-8111-111111111111",
        name: "Owner User",
      },
      ok: true,
      status: "success",
    });

    const response = await PATCH(makePatchRequest({ displayName: "Owner User" }));

    expect(response.status).toBe(200);
    expect(updateCurrentProfileMock).toHaveBeenCalledWith("Owner User");
  });

  it("rejects malformed update bodies", async () => {
    const response = await PATCH(makePatchRequest({ name: "Owner User" }));

    expect(response.status).toBe(400);
    expect(updateCurrentProfileMock).not.toHaveBeenCalled();
  });
});
