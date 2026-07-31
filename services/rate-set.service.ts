import * as rateSetRepo from "@/repositories/rate-set.repository";
import {
  validateRateSet,
  type RateSetInput,
  type ValidationErrors,
} from "@/modules/rate-set/validation";
import { recordAuditLog, type ActorContext } from "@/lib/audit";

export class RateSetValidationError extends Error {
  constructor(public details: ValidationErrors) {
    super("Validation failed");
    this.name = "RateSetValidationError";
  }
}

export class RateSetConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateSetConflictError";
  }
}

export class RateSetNotFoundError extends Error {
  constructor() {
    super("Rate set not found.");
    this.name = "RateSetNotFoundError";
  }
}

// Postgres SQLSTATE for an EXCLUDE constraint violation. rate_set has a GIST
// exclusion constraint (rate_set_no_overlap_excl) that rejects overlapping
// date ranges at the DB level, so we don't hand-check overlaps here — we just
// translate that error into a friendly conflict.
const EXCLUSION_VIOLATION = "23P01";

function isDbError(err: unknown): err is { code: string } {
  return typeof err === "object" && err !== null && "code" in err;
}

function assertValid(input: RateSetInput) {
  const errors = validateRateSet(input);
  if (Object.keys(errors).length > 0) {
    throw new RateSetValidationError(errors);
  }
}

function toInsertableValues(input: RateSetInput) {
  const startDate = input.start_date as string;
  const endDate = input.end_date ? (input.end_date as string) : null;
  return {
    name: (input.name as string).trim(),
    description: input.description ? (input.description as string).trim() : null,
    start_date: `${startDate}T00:00:00.000Z`,
    end_date: endDate ? `${endDate}T23:59:59.999Z` : null,
  };
}

// Existing rows already carry their stored time-of-day (T00:00:00/T23:59:59), unlike
// `input` which is a plain YYYY-MM-DD the DB round-trip hasn't touched yet — don't run
// it back through toInsertableValues, or the date-suffixing would double up.
function toAuditFields(row: { name: string; description: string | null; start_date: Date; end_date: Date | null }) {
  return {
    name: row.name,
    description: row.description,
    start_date: row.start_date,
    end_date: row.end_date,
  };
}

async function runOrConflict<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (isDbError(err) && err.code === EXCLUSION_VIOLATION) {
      throw new RateSetConflictError(
        "This rate set's date range overlaps with an existing rate set.",
      );
    }
    throw err;
  }
}

export async function listRateSetsPaged(page: number, pageSize: number) {
  const offset = (page - 1) * pageSize;
  return rateSetRepo.listRateSets({ limit: pageSize, offset });
}

export async function getRateSet(id: number) {
  const rateSet = await rateSetRepo.getRateSetById(id);
  if (!rateSet) {
    throw new RateSetNotFoundError();
  }
  return rateSet;
}

export async function createRateSet(input: RateSetInput, actor: ActorContext) {
  assertValid(input);

  const values = toInsertableValues(input);
  const rateSet = await runOrConflict(() => rateSetRepo.insertRateSet(values));

  await recordAuditLog({
    actor: { userId: actor.userId, roleId: actor.roleId },
    permissionCode: actor.permissionCode,
    action: "create",
    entity: "rate_set",
    entityId: rateSet.id,
    after: values,
  });

  return rateSet;
}

export async function updateRateSetById(id: number, input: RateSetInput, actor: ActorContext) {
  assertValid(input);

  const existing = await rateSetRepo.getRateSetById(id);
  if (!existing) {
    throw new RateSetNotFoundError();
  }
  const before = toAuditFields(existing);

  const values = toInsertableValues(input);
  const updated = await runOrConflict(() => rateSetRepo.updateRateSet(id, values));
  if (!updated) {
    throw new RateSetNotFoundError();
  }

  await recordAuditLog({
    actor: { userId: actor.userId, roleId: actor.roleId },
    permissionCode: actor.permissionCode,
    action: "update",
    entity: "rate_set",
    entityId: id,
    before,
    after: values,
  });

  return updated;
}

export async function deleteRateSetById(id: number, actor: ActorContext) {
  const existing = await rateSetRepo.getRateSetById(id);
  if (!existing) {
    throw new RateSetNotFoundError();
  }

  const deleted = await rateSetRepo.deleteRateSet(id);
  if (!deleted) {
    throw new RateSetNotFoundError();
  }

  await recordAuditLog({
    actor: { userId: actor.userId, roleId: actor.roleId },
    permissionCode: actor.permissionCode,
    action: "delete",
    entity: "rate_set",
    entityId: id,
    before: toAuditFields(existing),
  });
}
