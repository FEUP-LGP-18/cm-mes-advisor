import { NextResponse } from "next/server";
import { listMembers } from "@/lib/projects/members.server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

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

    const result = await listMembers(projectId);

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
