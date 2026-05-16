import { NextResponse } from "next/server";
import {
  deleteProject,
  updateProjectMetadata,
} from "@/lib/projects/settings.server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function toHttpStatus(status: string): number {
  if (status === "forbidden") return 403;
  if (status === "not_authenticated") return 401;
  if (status === "not_found") return 404;
  if (status === "conflict") return 409;
  if (status === "validation_error") return 400;
  if (status === "internal_error") return 500;
  return 400;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Server-side project management requires Supabase." },
        { status: 501 },
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body.name !== "string") {
      return NextResponse.json(
        { error: "Request body must include a name field." },
        { status: 400 },
      );
    }

    const result = await updateProjectMetadata(projectId, {
      customerName: body.customerName ?? null,
      description: body.description ?? null,
      name: body.name,
    });

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
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Server-side project management requires Supabase." },
        { status: 501 },
      );
    }

    const result = await deleteProject(projectId);

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
