import { NextResponse } from "next/server";
import { createInvite, listInvites } from "@/lib/projects/invites.server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { ProjectRole } from "@/lib/projects/types";

function toHttpStatus(status: string): number {
  if (status === "forbidden") return 403;
  if (status === "not_authenticated") return 401;
  if (status === "not_found") return 404;
  if (status === "conflict") return 409;
  if (status === "internal_error") return 500;
  return 400;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;

    if (!isSupabaseConfigured()) {
      return NextResponse.json([]);
    }

    const result = await listInvites(projectId);

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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Server-side collaboration requires Supabase." },
        { status: 501 },
      );
    }

    let body: Record<string, unknown>;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 },
      );
    }

    const { email, role } = body;

    const origin = new URL(request.url).origin;
    const result = await createInvite(
      projectId,
      email as string,
      role as ProjectRole,
      origin,
    );

    if (result.ok) {
      return NextResponse.json(result.data, { status: 201 });
    }

    return NextResponse.json(
      { error: result.message },
      { status: toHttpStatus(result.status) },
    );
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
