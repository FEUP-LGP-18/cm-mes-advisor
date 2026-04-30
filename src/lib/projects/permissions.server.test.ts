import { afterEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import {
  getCapabilitiesForRole,
  requireProjectCapability,
  requireUser,
} from "./permissions.server";
import type { ProjectCapability, ProjectRole } from "./types";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

const createClientMock = vi.mocked(createClient);

const userId = "11111111-1111-4111-8111-111111111111";
const projectId = "22222222-2222-4222-8222-222222222222";

describe("project permission service", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("maps viewer, editor, and owner roles to the expected capabilities", () => {
    const expectations: Record<ProjectRole, ProjectCapability[]> = {
      editor: ["read_project", "edit_project_state", "upload_project_file"],
      owner: [
        "read_project",
        "edit_project_state",
        "upload_project_file",
        "manage_project_settings",
        "manage_project_members",
        "archive_project",
        "delete_project",
      ],
      viewer: ["read_project"],
    };

    expect(getCapabilitiesForRole("viewer")).toEqual(expectations.viewer);
    expect(getCapabilitiesForRole("editor")).toEqual(expectations.editor);
    expect(getCapabilitiesForRole("owner")).toEqual(expectations.owner);
    expect(getCapabilitiesForRole(null)).toEqual([]);
  });

  it("fails closed when there is no authenticated user", async () => {
    createClientMock.mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    await expect(requireUser()).resolves.toMatchObject({
      ok: false,
      status: "not_authenticated",
    });
  });

  it("blocks non-member project access", async () => {
    createClientMock
      .mockResolvedValueOnce({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                email: "owner@example.com",
                id: userId,
                user_metadata: {},
              },
            },
          }),
        },
      } as unknown as Awaited<ReturnType<typeof createClient>>)
      .mockResolvedValueOnce({
        rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      } as unknown as Awaited<ReturnType<typeof createClient>>);

    await expect(
      requireProjectCapability(projectId, "read_project"),
    ).resolves.toMatchObject({
      ok: false,
      status: "forbidden",
    });
  });
});
