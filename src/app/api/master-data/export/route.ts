import { NextResponse } from "next/server";
import { createMasterDataExportPackage } from "@/lib/master-data/export";
import {
  parseMasterDataExportRequestBody,
  type MasterDataExportRouteBody,
} from "@/lib/master-data/api";

export async function POST(request: Request) {
  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return errorResponse(
      400,
      "invalid-request",
      "Request body must be valid JSON containing the generated Master Data objects to export.",
    );
  }

  const parsedBody = parseMasterDataExportRequestBody(rawBody);

  if (!parsedBody.ok) {
    return errorResponse(400, "invalid-request", parsedBody.message);
  }

  try {
    const result = await createMasterDataExportPackage(parsedBody.body);
    const body: MasterDataExportRouteBody = {
      ok: true,
      fileName: result.fileName,
      mimeType: "application/zip",
      packageBase64: result.packageBuffer.toString("base64"),
      summary: result.summary,
    };

    return NextResponse.json(body);
  } catch (error) {
    return errorResponse(
      500,
      "export-failed",
      error instanceof Error
        ? error.message
        : "Master Data export failed before the package could be created.",
    );
  }
}

function errorResponse(
  status: number,
  code: "invalid-request" | "export-failed",
  message: string,
) {
  const body: MasterDataExportRouteBody = {
    ok: false,
    error: {
      code,
      message,
    },
  };

  return NextResponse.json(body, { status });
}
