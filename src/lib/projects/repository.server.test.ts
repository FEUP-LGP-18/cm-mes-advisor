import { afterEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import {
  requireProjectCapability,
  requireUser,
} from "./permissions.server";
import { saveProjectPhaseState } from "./repository.server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("./permissions.server", () => ({
  requireProjectCapability: vi.fn(),
  requireUser: vi.fn(),
}));

const createClientMock = vi.mocked(createClient);
const requireUserMock = vi.mocked(requireUser);
const requireProjectCapabilityMock = vi.mocked(requireProjectCapability);

const userId = "11111111-1111-4111-8111-111111111111";
const projectId = "22222222-2222-4222-8222-222222222222";

describe("project repository", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("fails closed before saving phase state without an authenticated user", async () => {
    requireUserMock.mockResolvedValueOnce({
      message: "Authentication required.",
      ok: false,
      status: "not_authenticated",
    });

    await expect(
      saveProjectPhaseState(projectId, "review", {}, 1, userId),
    ).resolves.toMatchObject({
      ok: false,
      status: "not_authenticated",
    });

    expect(requireProjectCapabilityMock).not.toHaveBeenCalled();
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("returns conflict when the expected phase state version is stale", async () => {
    requireUserMock.mockResolvedValueOnce({
      data: {
        email: "editor@example.com",
        id: userId,
      },
      ok: true,
      status: "success",
    });
    requireProjectCapabilityMock.mockResolvedValueOnce({
      data: {
        email: "editor@example.com",
        id: userId,
      },
      ok: true,
      status: "success",
    });

    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        phase_key: "review",
        project_id: projectId,
        state_json: { draftCount: 3 },
        updated_at: "2026-04-30T12:00:00.000Z",
        updated_by: userId,
        version: 2,
      },
      error: null,
    });
    const eqPhaseKey = vi.fn().mockReturnValue({ maybeSingle });
    const eqProjectId = vi.fn().mockReturnValue({ eq: eqPhaseKey });
    const select = vi.fn().mockReturnValue({ eq: eqProjectId });
    const from = vi.fn().mockReturnValue({ select });

    createClientMock.mockResolvedValueOnce({
      from,
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    await expect(
      saveProjectPhaseState(projectId, "review", { draftCount: 4 }, 1, userId),
    ).resolves.toMatchObject({
      ok: false,
      status: "conflict",
    });
  });
});
