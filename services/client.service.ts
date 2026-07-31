import * as clientRepo from "@/repositories/client.repository";
import { validateClient, type ClientInput, type ValidationErrors } from "@/modules/client/validation";
import { recordAuditLog, type ActorContext } from "@/lib/audit";

export class ClientValidationError extends Error {
  constructor(public details: ValidationErrors) {
    super("Validation failed");
    this.name = "ClientValidationError";
  }
}

export class ClientConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClientConflictError";
  }
}

export class ClientNotFoundError extends Error {
  constructor() {
    super("Participant not found.");
    this.name = "ClientNotFoundError";
  }
}

function assertValid(input: ClientInput) {
  const errors = validateClient(input);
  if (Object.keys(errors).length > 0) {
    throw new ClientValidationError(errors);
  }
}

async function assertNdisNumberUnique(ndisNumber: string, excludeId?: number) {
  const existing = await clientRepo.findClientByNdisNumber(ndisNumber, excludeId);
  if (existing) {
    throw new ClientConflictError(
      `A participant with NDIS number ${ndisNumber} already exists.`,
    );
  }
}

function toInsertableValues(input: ClientInput) {
  return {
    first_name: (input.first_name as string).trim(),
    last_name: (input.last_name as string).trim(),
    gender_id: input.gender_id as number,
    dob: input.dob as string,
    ndis_number: input.ndis_number as string,
    email: (input.email as string).trim(),
    phone_number: input.phone_number ? (input.phone_number as string).trim() : null,
    address: (input.address as string).trim(),
    unit_building: input.unit_building ? (input.unit_building as string).trim() : null,
    pricing_region: input.pricing_region as string,
  };
}

export async function listClientsPaged(page: number, pageSize: number) {
  const offset = (page - 1) * pageSize;
  return clientRepo.listClients({ limit: pageSize, offset });
}

export async function getClient(id: number) {
  const client = await clientRepo.getClientById(id);
  if (!client) {
    throw new ClientNotFoundError();
  }
  return client;
}

export async function createClient(input: ClientInput, actor: ActorContext) {
  assertValid(input);
  await assertNdisNumberUnique(input.ndis_number as string);

  const values = toInsertableValues(input);
  const client = await clientRepo.insertClient(values);

  await recordAuditLog({
    actor: { userId: actor.userId, roleId: actor.roleId },
    permissionCode: actor.permissionCode,
    action: "create",
    entity: "client",
    entityId: client.id,
    after: values,
  });

  return client;
}

export async function updateClientById(id: number, input: ClientInput, actor: ActorContext) {
  assertValid(input);
  await assertNdisNumberUnique(input.ndis_number as string, id);

  const existing = await clientRepo.getClientById(id);
  if (!existing) {
    throw new ClientNotFoundError();
  }
  const before = toInsertableValues(existing);

  const values = toInsertableValues(input);
  const updated = await clientRepo.updateClient(id, values);
  if (!updated) {
    throw new ClientNotFoundError();
  }

  await recordAuditLog({
    actor: { userId: actor.userId, roleId: actor.roleId },
    permissionCode: actor.permissionCode,
    action: "update",
    entity: "client",
    entityId: id,
    before,
    after: values,
  });

  return updated;
}

export async function deleteClientById(id: number, actor: ActorContext) {
  const existing = await clientRepo.getClientById(id);
  if (!existing) {
    throw new ClientNotFoundError();
  }

  const deleted = await clientRepo.deleteClient(id);
  if (!deleted) {
    throw new ClientNotFoundError();
  }

  await recordAuditLog({
    actor: { userId: actor.userId, roleId: actor.roleId },
    permissionCode: actor.permissionCode,
    action: "delete",
    entity: "client",
    entityId: id,
    before: toInsertableValues(existing),
  });
}
