import { sql, type Insertable, type Updateable } from "kysely";
import { db } from "@/lib/db";
import type { InvoiceUploadBatchTable, InvoiceUploadFileTable } from "@/db/types";

export async function insertUploadBatch(values: Insertable<InvoiceUploadBatchTable>) {
  return db.insertInto("invoice_upload_batch").values(values).returningAll().executeTakeFirstOrThrow();
}

export async function updateUploadBatch(id: string, values: Updateable<InvoiceUploadBatchTable>) {
  return db
    .updateTable("invoice_upload_batch")
    .set({ ...values, updated_at: sql`now()` })
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
}

export async function insertUploadFile(values: Insertable<InvoiceUploadFileTable>) {
  return db.insertInto("invoice_upload_file").values(values).returningAll().executeTakeFirstOrThrow();
}

export async function updateUploadFile(id: string, values: Updateable<InvoiceUploadFileTable>) {
  return db
    .updateTable("invoice_upload_file")
    .set({ ...values, updated_at: sql`now()` })
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
}

export async function listUploadBatches({ limit, offset }: { limit: number; offset: number }) {
  const [rows, totalRow] = await Promise.all([
    db
      .selectFrom("invoice_upload_batch")
      .leftJoin("app_user", "app_user.id", "invoice_upload_batch.uploaded_by")
      .select([
        "invoice_upload_batch.id",
        "invoice_upload_batch.uploaded_by",
        "invoice_upload_batch.status",
        "invoice_upload_batch.file_count",
        "invoice_upload_batch.total_size",
        "invoice_upload_batch.error_message",
        "invoice_upload_batch.created_at",
        "invoice_upload_batch.updated_at",
        "app_user.full_name as uploader_name",
      ])
      .orderBy("invoice_upload_batch.created_at", "desc")
      .limit(limit)
      .offset(offset)
      .execute(),
    db
      .selectFrom("invoice_upload_batch")
      .select(({ fn }) => fn.countAll<string>().as("count"))
      .executeTakeFirstOrThrow(),
  ]);

  return { rows, total: Number(totalRow.count) };
}

export async function listUploadFilesForBatches(batchIds: string[]) {
  if (batchIds.length === 0) return [];
  return db
    .selectFrom("invoice_upload_file")
    .selectAll()
    .where("batch_id", "in", batchIds)
    .orderBy("created_at", "asc")
    .execute();
}

export async function getUploadFileById(id: string) {
  return db.selectFrom("invoice_upload_file").selectAll().where("id", "=", id).executeTakeFirst();
}
