import * as providerRepo from "@/lib/data-access/repositories/provider.repository";
import {
  validateProvider,
  type ProviderInput,
  type ValidationErrors,
} from "@/app/_screens/provider/validation";

export class ProviderValidationError extends Error {
  constructor(public details: ValidationErrors) {
    super("Validation failed");
    this.name = "ProviderValidationError";
  }
}

export class ProviderNotFoundError extends Error {
  constructor() {
    super("Provider not found.");
    this.name = "ProviderNotFoundError";
  }
}

function assertValid(input: ProviderInput) {
  const errors = validateProvider(input);
  if (Object.keys(errors).length > 0) {
    throw new ProviderValidationError(errors);
  }
}

function toInsertableValues(input: ProviderInput) {
  return {
    abn: input.abn as string,
    name: (input.name as string).trim(),
    email: (input.email as string).trim(),
    phone_number: input.phone_number ? (input.phone_number as string).trim() : null,
    address: (input.address as string).trim(),
    unit_building: input.unit_building ? (input.unit_building as string).trim() : null,
  };
}

export async function listProvidersPaged(page: number, pageSize: number) {
  const offset = (page - 1) * pageSize;
  return providerRepo.listProviders({ limit: pageSize, offset });
}

export async function getProvider(id: number) {
  const provider = await providerRepo.getProviderById(id);
  if (!provider) {
    throw new ProviderNotFoundError();
  }
  return provider;
}

export async function createProvider(input: ProviderInput) {
  assertValid(input);
  return providerRepo.insertProvider(toInsertableValues(input));
}

export async function updateProviderById(id: number, input: ProviderInput) {
  assertValid(input);

  const updated = await providerRepo.updateProvider(id, toInsertableValues(input));
  if (!updated) {
    throw new ProviderNotFoundError();
  }
  return updated;
}
