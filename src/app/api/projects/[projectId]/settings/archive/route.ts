import { NextResponse } from "next/server";
import { archiveProject, unarchiveProject } from "@/lib/projects/settings.server";
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

export async function POST(
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
    const action: unknown = body?.action;

    if (action !== "archive" && action !== "unarchive") {
      return NextResponse.json(
        { error: 'Body must include action: "archive" or "unarchive".' },
        { status: 400 },
      );
    }

    const result =
      action === "archive"
        ? await archiveProject(projectId)
        : await unarchiveProject(projectId);

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
