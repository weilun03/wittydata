import BigNumber from "bignumber.js";
import type { Kysely } from "kysely";
import { db } from "@/lib/db";
import type { Database } from "@/db/types";
import * as clientRepo from "@/repositories/client.repository";
import * as providerRepo from "@/repositories/provider.repository";
import * as lookupRepo from "@/repositories/invoice-lookup.repository";
import * as invoiceRepo from "@/repositories/invoice.repository";
import { rankByNameTokenMatches, tokenizeName } from "@/modules/invoice-upload/matching";
import type { ExtractedInvoiceData, ExtractedLineItem } from "@/modules/invoice-upload/types";
import { toUtcEndOfDay, toUtcStartOfDay } from "@/modules/invoice/dates";
import { recordAuditLog, type ActorContext } from "@/lib/audit";

type DbOrTrx = Kysely<Database>;

export class InvoiceDraftCreationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvoiceDraftCreationError";
  }
}

function round2(value: BigNumber.Value): string {
  return new BigNumber(value).toFixed(2, BigNumber.ROUND_HALF_UP);
}

function toDecimalOrNull(value: string | null): string | null {
  if (value == null) return null;
  const n = new BigNumber(value);
  return n.isFinite() ? n.toString() : null;
}

// Spec 11.4 Participant Mapping: single ndis_number match wins outright; with
// several matches, rank by participant_name token overlap (id tiebreak); no
// match at any stage leaves client_id null rather than guessing.
async function matchParticipant(data: ExtractedInvoiceData): Promise<number | null> {
  if (!data.participant_ndis_number) return null;
  const matches = await clientRepo.findActiveClientsByNdisNumber(data.participant_ndis_number);
  if (matches.length === 1) return matches[0].id;
  if (matches.length === 0 || !data.participant_name) return null;
  return rankByNameTokenMatches(matches, tokenizeName(data.participant_name))?.id ?? null;
}

// Spec 11.4 Provider Mapping: same pattern as participant matching, keyed on ABN.
async function matchProvider(data: ExtractedInvoiceData): Promise<number | null> {
  if (!data.provider_abn) return null;
  const matches = await providerRepo.findActiveProvidersByAbn(data.provider_abn);
  if (matches.length === 1) return matches[0].id;
  if (matches.length === 0 || !data.provider_name) return null;
  return rankByNameTokenMatches(matches, tokenizeName(data.provider_name))?.id ?? null;
}

interface MappedLineItem {
  rate_set_id: number | null;
  category_id: number | null;
  support_item_id: number | null;
  start_date: string | null;
  end_date: string | null;
  max_rate: string | null;
  unit: string | null;
  input_rate: string | null;
  amount: string | null;
}

// Spec 11.4 Rate Set / Support Item / Invoice Item Mapping. Every lookup only
// commits to an id when exactly one candidate matches; ambiguous or absent
// matches leave the field null so the user can fill it in during review.
async function mapLineItem(
  item: ExtractedLineItem,
  clientPricingRegion: string | null,
  trx: DbOrTrx,
): Promise<MappedLineItem> {
  const startDate = item.service_start_date ? toUtcStartOfDay(item.service_start_date) : null;
  const endDate = item.service_end_date ? toUtcEndOfDay(item.service_end_date) : null;

  let rateSetId: number | null = null;
  if (startDate && endDate) {
    const rateSets = await lookupRepo.findRateSetsOverlapping(startDate, endDate, trx);
    if (rateSets.length === 1) rateSetId = rateSets[0].id;
  }

  let supportItemId: number | null = null;
  let categoryId: number | null = null;
  if (rateSetId != null && item.support_item_number) {
    const supportItems = await lookupRepo.findSupportItemsByItemNumber(
      rateSetId,
      item.support_item_number,
      trx,
    );
    if (supportItems.length === 1) {
      supportItemId = supportItems[0].id;
      categoryId = supportItems[0].category_id;
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

  const unit = toDecimalOrNull(item.unit);
  const inputRate = toDecimalOrNull(item.invoiced_rate);
  const amount = unit != null && inputRate != null ? round2(new BigNumber(unit).times(inputRate)) : null;

  return {
    rate_set_id: rateSetId,
    category_id: categoryId,
    support_item_id: supportItemId,
    start_date: startDate,
    end_date: endDate,
    max_rate: maxRate,
    unit,
    input_rate: inputRate,
    amount,
  };
}

// Spec 11.4: invoice_number is the only field that can't be null — everything
// else (client, provider, dates, amounts, per-item ids) degrades to null when it
// can't be confidently resolved, leaving a status="drafted" invoice for the user
// to review and complete via the normal invoice edit screen.
export async function createDraftInvoiceFromExtraction(
  data: ExtractedInvoiceData,
  actor: ActorContext,
) {
  if (!data.invoice_number) {
    throw new InvoiceDraftCreationError(
      "Cannot create an invoice draft: no invoice number could be extracted from this PDF.",
    );
  }

  const clientId = await matchParticipant(data);
  const providerId = await matchProvider(data);
  const clientPricingRegion =
    clientId != null ? await lookupRepo.getClientPricingRegion(clientId) : null;

  const { invoice, items } = await db.transaction().execute(async (trx) => {
    const mappedItems: MappedLineItem[] = [];
    for (const item of data.line_items) {
      mappedItems.push(await mapLineItem(item, clientPricingRegion, trx));
    }

    const itemAmounts = mappedItems.map((m) => m.amount);
    const amount =
      mappedItems.length > 0 && itemAmounts.every((a): a is string => a != null)
        ? round2(itemAmounts.reduce((sum, a) => sum.plus(a), new BigNumber(0)))
        : null;

    const invoiceRow = await invoiceRepo.insertInvoice(trx, {
      client_id: clientId,
      provider_id: providerId,
      invoice_number: data.invoice_number!.trim(),
      invoice_date: data.invoice_date,
      amount,
      expected_amount: toDecimalOrNull(data.stated_invoice_total),
      status: "drafted",
    });

    const insertedItems =
      mappedItems.length > 0
        ? await invoiceRepo.insertInvoiceItems(
            trx,
            mappedItems.map((item, index) => ({ ...item, invoice_id: invoiceRow.id, sort_order: index })),
          )
        : [];

    return { invoice: invoiceRow, items: insertedItems };
  });

  await recordAuditLog({
    actor: { userId: actor.userId, roleId: actor.roleId },
    permissionCode: actor.permissionCode,
    action: "create",
    entity: "invoice",
    entityId: invoice.id,
    after: {
      client_id: invoice.client_id,
      provider_id: invoice.provider_id,
      invoice_number: invoice.invoice_number,
      invoice_date: invoice.invoice_date,
      amount: invoice.amount,
      expected_amount: invoice.expected_amount,
      status: invoice.status,
      source: "ai_extraction",
    },
  });

  return { invoice, items };
}
