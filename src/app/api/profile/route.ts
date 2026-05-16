import { NextResponse } from "next/server";
import {
  getCurrentProfile,
  updateCurrentProfile,
} from "@/lib/projects/profile.server";
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

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Profile persistence requires Supabase." },
      { status: 501 },
    );
  }

  const result = await getCurrentProfile();

  if (result.ok) {
    return NextResponse.json(result.data);
  }

  return NextResponse.json(
    { error: result.message },
    { status: toHttpStatus(result.status) },
  );
}

export async function PATCH(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Profile persistence requires Supabase." },
      { status: 501 },
    );
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.displayName !== "string") {
    return NextResponse.json(
      { error: "Request body must include a displayName field." },
      { status: 400 },
    );
  }

  const result = await updateCurrentProfile(body.displayName);

  if (result.ok) {
    return NextResponse.json(result.data);
  }

  return NextResponse.json(
    { error: result.message },
    { status: toHttpStatus(result.status) },
  );
}
