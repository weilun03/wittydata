import type { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/util-helpers/api-response";
import {
  importRateSetExcel,
  RateSetImportNotFoundError,
  RateSetImportValidationError,
} from "@/lib/data-access/services/rate-set-import.service";

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) ? id : null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id == null) {
    return apiError(400, "VALIDATION_ERROR", "Invalid rate set id.");
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return apiError(400, "VALIDATION_ERROR", "An Excel file is required (field name 'file').");
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const summary = await importRateSetExcel(id, buffer);
    return apiSuccess(summary);
  } catch (err) {
    if (err instanceof RateSetImportNotFoundError) {
      return apiError(404, "NOT_FOUND", err.message);
    }
    if (err instanceof RateSetImportValidationError) {
      return apiError(400, "VALIDATION_ERROR", err.message);
    }
    console.error(err);
    return apiError(500, "INTERNAL_ERROR", "Something went wrong while importing the file.");
  }
}
