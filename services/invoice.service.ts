import BigNumber from "bignumber.js";
import type { Kysely } from "kysely";
import { db } from "@/lib/db";
import type { Database } from "@/db/types";
import * as invoiceRepo from "@/repositories/invoice.repository";
import * as lookupRepo from "@/repositories/invoice-lookup.repository";
import {
  isPositiveIntegerInput,
  isValidDateInput,
  isValidDecimalInput,
  validateInvoiceCompletionFields,
  validateInvoiceDraftBase,
  type InvoiceInput,
  type InvoiceItemInput,
  type ValidationErrors,
} from "@/modules/invoice/validation";
import { toUtcEndOfDay, toUtcStartOfDay } from "@/modules/invoice/dates";
import { recordAuditLog, type ActorContext } from "@/lib/audit";

export class InvoiceValidationError extends Error {
  constructor(public details: ValidationErrors) {
    super("Validation failed");
    this.name = "InvoiceValidationError";
  }
}

export class InvoiceConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvoiceConflictError";
  }
}

export class InvoiceNotFoundError extends Error {
  constructor() {
    super("Invoice not found.");
    this.name = "InvoiceNotFoundError";
  }
}

const UNIQUE_VIOLATION = "23505";

function isDbError(err: unknown): err is { code: string } {
  return typeof err === "object" && err !== null && "code" in err;
}

function round2(value: BigNumber.Value): string {
  return new BigNumber(value).toFixed(2, BigNumber.ROUND_HALF_UP);
}

// invoice/invoice_item amount columns are numeric(24,4), so Postgres reads them
// back padded to 4 decimal places (e.g. "157.6200") even though every write path
// already rounds to 2dp before storage. Reformat on the way out so API responses
// show the same precision that was actually stored/intended.
function formatMoney(value: string | null): string | null {
  return value == null ? null : round2(value);
}

interface ComputedItem {
  category_id: number | null;
  support_item_id: number | null;
  start_date: string | null;
  end_date: string | null;
  unit: string | null;
  input_rate: string | null;
  rate_set_id: number | null;
  max_rate: string | null;
  amount: string | null;
}

async function computeItem(
  item: InvoiceItemInput,
  clientPricingRegion: string | null,
  trx: Kysely<Database>,
): Promise<{ values: ComputedItem; errors: string[] }> {
  const errors: string[] = [];

  const categoryId = isPositiveIntegerInput(item.category_id) ? item.category_id : null;
  const supportItemId = isPositiveIntegerInput(item.support_item_id) ? item.support_item_id : null;
  const startDate = isValidDateInput(item.start_date) ? toUtcStartOfDay(item.start_date) : null;
  const endDate = isValidDateInput(item.end_date) ? toUtcEndOfDay(item.end_date) : null;
  const unit = isValidDecimalInput(item.unit) ? String(item.unit) : null;
  const inputRate = isValidDecimalInput(item.input_rate) ? String(item.input_rate) : null;

  if (categoryId == null) errors.push("Category is required.");
  if (supportItemId == null) errors.push("Support item is required.");
  if (startDate == null) errors.push("Start date is required.");
  if (endDate == null) errors.push("End date is required.");
  if (unit == null) errors.push("Unit is required and must be a decimal.");
  if (inputRate == null) errors.push("Input rate is required and must be a decimal.");

  let rateSetId: number | null = null;
  if (startDate && endDate) {
    const matches = await lookupRepo.findRateSetsOverlapping(startDate, endDate, trx);
    if (matches.length === 1) {
      rateSetId = matches[0].id;
    } else if (matches.length === 0) {
      errors.push("No rate set matches the selected date range.");
    } else {
      errors.push("Multiple rate sets match the selected date range.");
    }
  }

  if (rateSetId != null && categoryId != null) {
    const category = await lookupRepo.getCategoryById(categoryId, trx);
    if (!category || category.deleted_at || category.rate_set_id !== rateSetId) {
      errors.push("Selected category does not belong to the matched rate set.");
    }
  }

  if (supportItemId != null && categoryId != null) {
    const supportItem = await lookupRepo.getSupportItemById(supportItemId, trx);
    if (!supportItem || supportItem.deleted_at || supportItem.category_id !== categoryId) {
      errors.push("Selected support item does not belong to the selected category.");
    }
  }

  let maxRate: string | null = null;
  if (rateSetId != null && supportItemId != null && startDate && endDate && clientPricingRegion) {
    const price = await lookupRepo.findBestPrice(
      { rateSetId, supportItemId, regionCode: clientPricingRegion, startDate, endDate },
      trx,
    );
    maxRate = price?.unit_price ?? null;
  }
  if (maxRate == null) {
    errors.push("Max rate is required (could not be resolved for this item).");
  }

  const amount = unit != null && inputRate != null ? round2(new BigNumber(unit).times(inputRate)) : null;

  return {
    values: {
      category_id: categoryId,
      support_item_id: supportItemId,
      start_date: startDate,
      end_date: endDate,
      unit,
      input_rate: inputRate,
      rate_set_id: rateSetId,
      max_rate: maxRate,
      amount,
    },
    errors,
  };
}

async function computeItems(
  items: InvoiceItemInput[],
  clientId: number | null,
  trx: Kysely<Database>,
) {
  const clientPricingRegion = clientId != null ? await lookupRepo.getClientPricingRegion(clientId, trx) : null;

  const results: ComputedItem[] = [];
  const itemErrors: Record<number, string[]> = {};

  for (const [index, item] of items.entries()) {
    const { values, errors } = await computeItem(item, clientPricingRegion, trx);
    results.push(values);
    if (errors.length > 0) itemErrors[index] = errors;
  }

  return { results, itemErrors };
}

// Audit payloads only cover the invoice's top-level fields, not the items array —
// items are re-derived from the date range/rate set on every save, so a full diff
// would mostly just be noise rather than meaningful change history.
function toAuditFields(invoice: {
  client_id: number | null;
  provider_id: number | null;
  invoice_number: string | null;
  invoice_date: string | null;
  amount: string | null;
  expected_amount: string | null;
  status: string;
}) {
  return {
    client_id: invoice.client_id,
    provider_id: invoice.provider_id,
    invoice_number: invoice.invoice_number,
    invoice_date: invoice.invoice_date,
    amount: invoice.amount,
    expected_amount: invoice.expected_amount,
    status: invoice.status,
  };
}

async function assembleInvoice(id: number, trx: Kysely<Database>) {
  const invoice = await invoiceRepo.getInvoiceById(id, trx);
  if (!invoice) throw new InvoiceNotFoundError();
  const items = await invoiceRepo.getInvoiceItemsByInvoiceId(id, trx);
  return {
    ...invoice,
    amount: formatMoney(invoice.amount),
    expected_amount: formatMoney(invoice.expected_amount),
    items: items.map((item) => ({
      ...item,
      max_rate: formatMoney(item.max_rate),
      input_rate: formatMoney(item.input_rate),
      amount: formatMoney(item.amount),
    })),
  };
}

function toItemsArray(input: InvoiceInput): InvoiceItemInput[] {
  return Array.isArray(input.items) ? (input.items as InvoiceItemInput[]) : [];
}

function validateAndThrowIfNeeded(
  input: InvoiceInput,
  status: "drafted" | "completed",
  items: InvoiceItemInput[],
  itemErrors: Record<number, string[]>,
  totalAmount: string,
) {
  const draftErrors = validateInvoiceDraftBase(input);
  if (Object.keys(draftErrors).length > 0) {
    throw new InvoiceValidationError(draftErrors);
  }
  if (status !== "completed") return;

  const errors: ValidationErrors = validateInvoiceCompletionFields(input);

  const expected = round2(input.expected_amount as string);
  if (expected !== totalAmount) {
    (errors.expected_amount ??= []).push(
      "Expected amount must equal the sum of the invoice item amounts.",
    );
  }
  if (items.length === 0) {
    (errors.items ??= []).push("At least one invoice item is required.");
  }
  if (Object.keys(itemErrors).length > 0) {
    errors.items = [
      ...(errors.items ?? []),
      ...Object.entries(itemErrors).map(([idx, errs]) => `Item ${Number(idx) + 1}: ${errs.join(" ")}`),
    ];
  }

  if (Object.keys(errors).length > 0) {
    throw new InvoiceValidationError(errors);
  }
}

async function withUniqueViolationMapped<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (isDbError(err) && err.code === UNIQUE_VIOLATION) {
      throw new InvoiceConflictError(
        "An invoice with this number already exists for this provider.",
      );
    }
    throw err;
  }
}

export async function listInvoicesPaged(page: number, pageSize: number) {
  const offset = (page - 1) * pageSize;
  const { rows, total } = await invoiceRepo.listInvoices({ limit: pageSize, offset });
  return {
    rows: rows.map((r) => ({
      id: r.id,
      client_id: r.client_id,
      provider_id: r.provider_id,
      client_name: r.client_first_name ? `${r.client_first_name} ${r.client_last_name}` : null,
      provider_name: r.provider_name,
      invoice_number: r.invoice_number,
      invoice_date: r.invoice_date,
      amount: formatMoney(r.amount),
      expected_amount: formatMoney(r.expected_amount),
      status: r.status,
      created_at: r.created_at,
      updated_at: r.updated_at,
    })),
    total,
  };
}

export async function getInvoice(id: number) {
  return assembleInvoice(id, db);
}

export async function createInvoice(input: InvoiceInput, actor: ActorContext) {
  const status = input.status === "completed" ? "completed" : "drafted";
  const items = toItemsArray(input);

  const invoice = await withUniqueViolationMapped(() =>
    db.transaction().execute(async (trx) => {
      const clientId = isPositiveIntegerInput(input.client_id) ? input.client_id : null;
      const providerId = isPositiveIntegerInput(input.provider_id) ? input.provider_id : null;

      const { results, itemErrors } = await computeItems(items, clientId, trx);
      const totalAmount = round2(
        results.reduce((sum, r) => (r.amount != null ? sum.plus(r.amount) : sum), new BigNumber(0)),
      );

      validateAndThrowIfNeeded(input, status, items, itemErrors, totalAmount);

      const invoiceRow = await invoiceRepo.insertInvoice(trx, {
        client_id: clientId,
        provider_id: providerId,
        invoice_number: (input.invoice_number as string).trim(),
        invoice_date: input.invoice_date as string,
        amount: totalAmount,
        expected_amount: round2(input.expected_amount as string),
        status,
      });

      await invoiceRepo.insertInvoiceItems(
        trx,
        results.map((r, index) => ({ ...r, invoice_id: invoiceRow.id, sort_order: index })),
      );

      return assembleInvoice(invoiceRow.id, trx);
    }),
  );

  await recordAuditLog({
    actor: { userId: actor.userId, roleId: actor.roleId },
    permissionCode: actor.permissionCode,
    action: "create",
    entity: "invoice",
    entityId: invoice.id,
    after: toAuditFields(invoice),
  });

  return invoice;
}

export async function updateInvoiceById(id: number, input: InvoiceInput, actor: ActorContext) {
  const status = input.status === "completed" ? "completed" : "drafted";
  const items = toItemsArray(input);
  let before: ReturnType<typeof toAuditFields> | null = null;

  const invoice = await withUniqueViolationMapped(() =>
    db.transaction().execute(async (trx) => {
      const existing = await invoiceRepo.getInvoiceById(id, trx);
      if (!existing) throw new InvoiceNotFoundError();
      before = toAuditFields(existing);

      const clientId = isPositiveIntegerInput(input.client_id) ? input.client_id : null;
      const providerId = isPositiveIntegerInput(input.provider_id) ? input.provider_id : null;

      const { results, itemErrors } = await computeItems(items, clientId, trx);
      const totalAmount = round2(
        results.reduce((sum, r) => (r.amount != null ? sum.plus(r.amount) : sum), new BigNumber(0)),
      );

      validateAndThrowIfNeeded(input, status, items, itemErrors, totalAmount);

      const updated = await invoiceRepo.updateInvoice(trx, id, {
        client_id: clientId,
        provider_id: providerId,
        invoice_number: (input.invoice_number as string).trim(),
        invoice_date: input.invoice_date as string,
        amount: totalAmount,
        expected_amount: round2(input.expected_amount as string),
        status,
      });
      if (!updated) throw new InvoiceNotFoundError();

      await invoiceRepo.softDeleteAllItemsForInvoice(trx, id);
      await invoiceRepo.insertInvoiceItems(
        trx,
        results.map((r, index) => ({ ...r, invoice_id: id, sort_order: index })),
      );

      return assembleInvoice(id, trx);
    }),
  );

  await recordAuditLog({
    actor: { userId: actor.userId, roleId: actor.roleId },
    permissionCode: actor.permissionCode,
    action: "update",
    entity: "invoice",
    entityId: id,
    before,
    after: toAuditFields(invoice),
  });

  return invoice;
}

export async function deleteInvoiceById(id: number, actor: ActorContext) {
  const existing = await db.transaction().execute(async (trx) => {
    const invoice = await invoiceRepo.getInvoiceById(id, trx);
    if (!invoice) throw new InvoiceNotFoundError();

    const deleted = await invoiceRepo.deleteInvoice(trx, id);
    if (!deleted) throw new InvoiceNotFoundError();

    // Items have no independent existence once their invoice is gone — same cascade
    // used when items are replaced on update (softDeleteAllItemsForInvoice).
    await invoiceRepo.softDeleteAllItemsForInvoice(trx, id);

    return invoice;
  });

  await recordAuditLog({
    actor: { userId: actor.userId, roleId: actor.roleId },
    permissionCode: actor.permissionCode,
    action: "delete",
    entity: "invoice",
    entityId: id,
    before: toAuditFields(existing),
  });
}

