import { NextResponse } from "next/server";
import { resendInvite } from "@/lib/projects/invites.server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string; inviteId: string }> },
) {
  try {
    const { projectId, inviteId } = await params;
    const origin = new URL(request.url).origin;
    const result = await resendInvite(inviteId, projectId, origin);

    if (result.ok) {
      return NextResponse.json(result.data);
    }

    const status =
      result.status === "forbidden" ? 403 :
      result.status === "not_authenticated" ? 401 :
      result.status === "not_found" ? 404 :
      result.status === "conflict" ? 409 :
      result.status === "internal_error" ? 500 : 400;

    return NextResponse.json(
      { error: result.message },
      { status },
    );
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
