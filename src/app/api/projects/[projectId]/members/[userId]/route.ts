import { NextResponse } from "next/server";
import { removeMember, updateMemberRole } from "@/lib/projects/members.server";
import type { ProjectRole } from "@/lib/projects/types";

function toHttpStatus(status: string): number {
  if (status === "forbidden") return 403;
  if (status === "not_authenticated") return 401;
  if (status === "not_found") return 404;
  if (status === "conflict") return 409;
  if (status === "internal_error") return 500;
  return 400;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; userId: string }> },
) {
  try {
    const { projectId, userId } = await params;

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const { role } = body;
    const result = await updateMemberRole(
      projectId,
      userId,
      role as ProjectRole,
    );

    if (result.ok) {
      return NextResponse.json(result.data);
    }

    return NextResponse.json(
      { error: result.message },
      { status: toHttpStatus(result.status) },
    );
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; userId: string }> },
) {
  try {
    const { projectId, userId } = await params;
    const result = await removeMember(projectId, userId);

    if (result.ok) {
      return NextResponse.json(result.data);
    }

    return NextResponse.json(
      { error: result.message },
      { status: toHttpStatus(result.status) },
    );
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
