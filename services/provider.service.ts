import * as providerRepo from "@/repositories/provider.repository";
import {
  validateProvider,
  type ProviderInput,
  type ValidationErrors,
} from "@/modules/provider/validation";
import { recordAuditLog, type ActorContext } from "@/lib/audit";

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

export async function createProvider(input: ProviderInput, actor: ActorContext) {
  assertValid(input);

  const values = toInsertableValues(input);
  const provider = await providerRepo.insertProvider(values);

  await recordAuditLog({
    actor: { userId: actor.userId, roleId: actor.roleId },
    permissionCode: actor.permissionCode,
    action: "create",
    entity: "provider",
    entityId: provider.id,
    after: values,
  });

  return provider;
}

export async function updateProviderById(id: number, input: ProviderInput, actor: ActorContext) {
  assertValid(input);

  const existing = await providerRepo.getProviderById(id);
  if (!existing) {
    throw new ProviderNotFoundError();
  }
  const before = toInsertableValues(existing);

  const values = toInsertableValues(input);
  const updated = await providerRepo.updateProvider(id, values);
  if (!updated) {
    throw new ProviderNotFoundError();
  }

  await recordAuditLog({
    actor: { userId: actor.userId, roleId: actor.roleId },
    permissionCode: actor.permissionCode,
    action: "update",
    entity: "provider",
    entityId: id,
    before,
    after: values,
  });

  return updated;
}

export async function deleteProviderById(id: number, actor: ActorContext) {
  const existing = await providerRepo.getProviderById(id);
  if (!existing) {
    throw new ProviderNotFoundError();
  }

  const deleted = await providerRepo.deleteProvider(id);
  if (!deleted) {
    throw new ProviderNotFoundError();
  }

  await recordAuditLog({
    actor: { userId: actor.userId, roleId: actor.roleId },
    permissionCode: actor.permissionCode,
    action: "delete",
    entity: "provider",
    entityId: id,
    before: toInsertableValues(existing),
  });
}
