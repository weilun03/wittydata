import { randomUUID } from "crypto";
import { ensureBucketExists, INVOICE_UPLOAD_BUCKET, minioClient } from "@/lib/s3";
import { extractInvoiceData } from "@/services/ai-extraction.service";
import {
  createDraftInvoiceFromExtraction,
  InvoiceDraftCreationError,
} from "@/services/invoice-draft.service";
import * as uploadRepo from "@/repositories/invoice-upload.repository";
import type { ActorContext } from "@/lib/audit";
import type { ExtractedInvoiceData } from "@/modules/invoice-upload/types";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // matches invoice_upload_file.size CHECK constraint

export class InvoiceUploadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvoiceUploadValidationError";
  }
}

const UNIQUE_VIOLATION = "23505";
function isDbError(err: unknown): err is { code: string } {
  return typeof err === "object" && err !== null && "code" in err;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
}

function buildWarnings(
  data: ExtractedInvoiceData,
  invoice: { client_id: number | null; provider_id: number | null; invoice_date: string | null; expected_amount: string | null },
  items: Array<{ rate_set_id: number | null; support_item_id: number | null; max_rate: string | null; unit: string | null; input_rate: string | null }>,
): string[] {
  const warnings: string[] = [];

  if (invoice.client_id == null) {
    warnings.push(
      data.participant_ndis_number
        ? `No participant found matching NDIS number ${data.participant_ndis_number}.`
        : "Participant could not be extracted from the invoice.",
    );
  }
  if (invoice.provider_id == null) {
    warnings.push(
      data.provider_abn
        ? `No provider found matching ABN ${data.provider_abn}.`
        : "Provider could not be extracted from the invoice.",
    );
  }
  if (invoice.invoice_date == null) warnings.push("Invoice date could not be extracted.");
  if (invoice.expected_amount == null) warnings.push("Invoice total could not be extracted.");
  if (items.length === 0) warnings.push("No line items could be extracted.");

  items.forEach((item, index) => {
    const label = `Line item ${index + 1}`;
    if (item.rate_set_id == null) warnings.push(`${label}: rate set could not be uniquely matched.`);
    if (item.rate_set_id != null && item.support_item_id == null) {
      warnings.push(`${label}: support item could not be uniquely matched.`);
    }
    if (item.rate_set_id != null && item.support_item_id != null && item.max_rate == null) {
      warnings.push(`${label}: no matching price found for the client's pricing region.`);
    }
    if (item.unit == null || item.input_rate == null) {
      warnings.push(`${label}: unit or rate could not be extracted.`);
    }
  });

  return warnings;
}

export interface InvoiceUploadResult {
  batchId: string;
  fileId: string;
  processingStatus: "draft_created" | "needs_review" | "failed";
  invoiceId: number | null;
  warnings: string[];
  errorMessage: string | null;
  extraction: ExtractedInvoiceData | null;
}

export async function uploadAndProcessInvoicePdf(
  file: { name: string; type: string; buffer: Buffer },
  actor: ActorContext,
): Promise<InvoiceUploadResult> {
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    throw new InvoiceUploadValidationError("Only PDF files are supported.");
  }
  if (file.buffer.length === 0) {
    throw new InvoiceUploadValidationError("The uploaded file is empty.");
  }
  if (file.buffer.length > MAX_FILE_SIZE) {
    throw new InvoiceUploadValidationError("The uploaded file exceeds the 10MB limit.");
  }

  const batch = await uploadRepo.insertUploadBatch({
    uploaded_by: actor.userId,
    status: "processing",
    file_count: 1,
    total_size: file.buffer.length,
  });

  const objectKey = `invoices/${batch.id}/${randomUUID()}-${sanitizeFileName(file.name)}`;
  await ensureBucketExists(INVOICE_UPLOAD_BUCKET);
  const putResult = await minioClient.putObject(
    INVOICE_UPLOAD_BUCKET,
    objectKey,
    file.buffer,
    file.buffer.length,
    { "Content-Type": "application/pdf" },
  );

  const uploadFile = await uploadRepo.insertUploadFile({
    batch_id: batch.id,
    original_name: file.name,
    object_key: objectKey,
    content_type: "application/pdf",
    size: file.buffer.length,
    etag: putResult.etag,
    processing_status: "processing",
    attempt_count: 1,
    processing_started_at: new Date(),
  });

  try {
    const { data, usage } = await extractInvoiceData(file.buffer);

    let processingStatus: InvoiceUploadResult["processingStatus"];
    let invoiceId: number | null = null;
    let warnings: string[] = [];
    let errorMessage: string | null = null;

    try {
      const { invoice, items } = await createDraftInvoiceFromExtraction(data, actor);
      invoiceId = invoice.id;
      warnings = buildWarnings(data, invoice, items);
      processingStatus = warnings.length > 0 ? "needs_review" : "draft_created";
    } catch (err) {
      if (err instanceof InvoiceDraftCreationError) {
        errorMessage = err.message;
      } else if (isDbError(err) && err.code === UNIQUE_VIOLATION) {
        errorMessage = "An invoice with this number already exists for this provider.";
      } else {
        throw err;
      }
      processingStatus = "failed";
    }

    await uploadRepo.updateUploadFile(uploadFile.id, {
      processing_status: processingStatus,
      invoice_id: invoiceId,
      warnings: JSON.stringify(warnings),
      extraction_result: JSON.stringify(data),
      error_message: errorMessage,
      ai_provider: usage.provider,
      model: usage.model,
      prompt_tokens: usage.promptTokens,
      completion_tokens: usage.completionTokens,
      total_tokens: usage.totalTokens,
      processing_completed_at: new Date(),
    });
    await uploadRepo.updateUploadBatch(batch.id, {
      status: processingStatus === "failed" ? "failed" : processingStatus === "needs_review" ? "completed_with_errors" : "completed",
    });

    return {
      batchId: batch.id,
      fileId: uploadFile.id,
      processingStatus,
      invoiceId,
      warnings,
      errorMessage,
      extraction: data,
    };
  } catch (err) {
    console.error("Invoice upload processing failed", err);
    const errorMessage = err instanceof Error ? err.message : "Unexpected error during processing.";
    await uploadRepo.updateUploadFile(uploadFile.id, {
      processing_status: "failed",
      error_message: errorMessage,
      processing_completed_at: new Date(),
    });
    await uploadRepo.updateUploadBatch(batch.id, { status: "failed", error_message: errorMessage });

    return {
      batchId: batch.id,
      fileId: uploadFile.id,
      processingStatus: "failed",
      invoiceId: null,
      warnings: [],
      errorMessage,
      extraction: null,
    };
  }
}

export interface UploadHistoryFile {
  id: string;
  original_name: string;
  content_type: string;
  size: number;
  processing_status: string;
  attempt_count: number;
  error_message: string | null;
  warnings: string[];
  invoice_id: number | null;
  ai_provider: string | null;
  model: string | null;
  processing_started_at: Date | null;
  processing_completed_at: Date | null;
  created_at: Date;
}

export interface UploadHistoryBatch {
  id: string;
  status: string;
  file_count: number;
  total_size: number;
  error_message: string | null;
  uploader_name: string | null;
  created_at: Date;
  updated_at: Date;
  files: UploadHistoryFile[];
}

export async function listUploadHistoryPaged(
  page: number,
  pageSize: number,
): Promise<{ rows: UploadHistoryBatch[]; total: number }> {
  const offset = (page - 1) * pageSize;
  const { rows: batches, total } = await uploadRepo.listUploadBatches({ limit: pageSize, offset });
  const files = await uploadRepo.listUploadFilesForBatches(batches.map((b) => b.id));

  const filesByBatch = new Map<string, typeof files>();
  for (const file of files) {
    const list = filesByBatch.get(file.batch_id) ?? [];
    list.push(file);
    filesByBatch.set(file.batch_id, list);
  }

  return {
    total,
    rows: batches.map((batch) => ({
      id: batch.id,
      status: batch.status,
      file_count: batch.file_count,
      total_size: batch.total_size,
      error_message: batch.error_message,
      uploader_name: batch.uploader_name,
      created_at: batch.created_at as unknown as Date,
      updated_at: batch.updated_at as unknown as Date,
      files: (filesByBatch.get(batch.id) ?? []).map((f) => ({
        id: f.id,
        original_name: f.original_name,
        content_type: f.content_type,
        size: f.size,
        processing_status: f.processing_status,
        attempt_count: f.attempt_count,
        error_message: f.error_message,
        warnings: Array.isArray(f.warnings) ? (f.warnings as string[]) : [],
        invoice_id: f.invoice_id,
        ai_provider: f.ai_provider,
        model: f.model,
        processing_started_at: f.processing_started_at as unknown as Date | null,
        processing_completed_at: f.processing_completed_at as unknown as Date | null,
        created_at: f.created_at as unknown as Date,
      })),
    })),
  };
}

export class UploadFileNotFoundError extends Error {
  constructor() {
    super("Upload file not found.");
    this.name = "UploadFileNotFoundError";
  }
}

// Short-lived signed URL rather than a public bucket — invoices can contain
// personal/financial data, so files stay private and are only reachable via an
// authenticated request through this endpoint.
export async function getUploadFileDownloadUrl(fileId: string): Promise<string> {
  const file = await uploadRepo.getUploadFileById(fileId);
  if (!file) throw new UploadFileNotFoundError();
  return minioClient.presignedGetObject(INVOICE_UPLOAD_BUCKET, file.object_key, 5 * 60);
}
