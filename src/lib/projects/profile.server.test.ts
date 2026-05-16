import { afterEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "./permissions.server";
import { getCurrentProfile, updateCurrentProfile } from "./profile.server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("./permissions.server", () => ({
  requireUser: vi.fn(),
}));

const createClientMock = vi.mocked(createClient);
const requireUserMock = vi.mocked(requireUser);

const user = {
  email: "owner@example.com",
  emailConfirmedAt: "2026-05-01T12:00:00.000Z",
  id: "11111111-1111-4111-8111-111111111111",
};

function mockUser() {
  requireUserMock.mockResolvedValueOnce({
    data: user,
    ok: true,
    status: "success",
  });
}

describe("profile server helpers", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("reads the current user's persisted profile", async () => {
    mockUser();

    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        display_name: "Owner User",
        email: "owner@example.com",
        id: user.id,
        updated_at: "2026-05-10T12:00:00.000Z",
      },
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });

    createClientMock.mockResolvedValueOnce({
      from,
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    await expect(getCurrentProfile()).resolves.toMatchObject({
      data: {
        email: "owner@example.com",
        id: user.id,
        name: "Owner User",
      },
      ok: true,
    });
  });

  it("creates a profile row when a signed-in user does not have one yet", async () => {
    mockUser();

    const maybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const selectExisting = vi.fn().mockReturnValue({ eq });

    const single = vi.fn().mockResolvedValue({
      data: {
        display_name: null,
        email: "owner@example.com",
        id: user.id,
        updated_at: "2026-05-10T12:00:00.000Z",
      },
      error: null,
    });
    const selectUpsert = vi.fn().mockReturnValue({ single });
    const upsert = vi.fn().mockReturnValue({ select: selectUpsert });
    const from = vi
      .fn()
      .mockReturnValueOnce({ select: selectExisting })
      .mockReturnValueOnce({ upsert });

    createClientMock.mockResolvedValueOnce({
      from,
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    await expect(getCurrentProfile()).resolves.toMatchObject({
      data: {
        email: "owner@example.com",
        id: user.id,
        name: null,
      },
      ok: true,
    });
    expect(upsert).toHaveBeenCalledWith(
      {
        display_name: null,
        email: "owner@example.com",
        id: user.id,
      },
      { onConflict: "id" },
    );
  });

  it("trims display names when updating the current user's profile", async () => {
    mockUser();

    const single = vi.fn().mockResolvedValue({
      data: {
        display_name: "Owner User",
        email: "owner@example.com",
        id: user.id,
        updated_at: "2026-05-10T12:00:00.000Z",
      },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ single });
    const upsert = vi.fn().mockReturnValue({ select });
    const from = vi.fn().mockReturnValue({ upsert });

    createClientMock.mockResolvedValueOnce({
      from,
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    await expect(updateCurrentProfile("  Owner User  ")).resolves.toMatchObject({
      data: {
        name: "Owner User",
      },
      ok: true,
    });
    expect(upsert).toHaveBeenCalledWith(
      {
        display_name: "Owner User",
        email: "owner@example.com",
        id: user.id,
      },
      { onConflict: "id" },
    );
  });

  it("rejects display names that are too long", async () => {
    mockUser();

    await expect(updateCurrentProfile("x".repeat(121))).resolves.toMatchObject({
      ok: false,
      status: "validation_error",
    });
    expect(createClientMock).not.toHaveBeenCalled();
  });
});
