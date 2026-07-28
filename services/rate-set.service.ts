import * as rateSetRepo from "@/repositories/rate-set.repository";
import {
  validateRateSet,
  type RateSetInput,
  type ValidationErrors,
} from "@/modules/rate-set/validation";

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

export async function createRateSet(input: RateSetInput) {
  assertValid(input);
  return runOrConflict(() => rateSetRepo.insertRateSet(toInsertableValues(input)));
}

export async function updateRateSetById(id: number, input: RateSetInput) {
  assertValid(input);

  const updated = await runOrConflict(() => rateSetRepo.updateRateSet(id, toInsertableValues(input)));
  if (!updated) {
    throw new RateSetNotFoundError();
  }
  return updated;
}
