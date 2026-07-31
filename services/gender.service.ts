import * as genderRepo from "@/repositories/gender.repository";
import { validateGender, type GenderInput, type ValidationErrors } from "@/modules/gender/validation";
import { recordAuditLog, type ActorContext } from "@/lib/audit";

export class GenderValidationError extends Error {
  constructor(public details: ValidationErrors) {
    super("Validation failed");
    this.name = "GenderValidationError";
  }
}

export class GenderConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GenderConflictError";
  }
}

export class GenderNotFoundError extends Error {
  constructor() {
    super("Gender not found.");
    this.name = "GenderNotFoundError";
  }
}

function assertValid(input: GenderInput) {
  const errors = validateGender(input);
  if (Object.keys(errors).length > 0) {
    throw new GenderValidationError(errors);
  }
}

async function assertCodeUnique(code: string, excludeId?: number) {
  const existing = await genderRepo.findGenderByCode(code, excludeId);
  if (existing) {
    throw new GenderConflictError(`A gender with code ${code} already exists.`);
  }
}

function toInsertableValues(input: GenderInput) {
  return {
    code: (input.code as string).trim().toUpperCase(),
    label: (input.label as string).trim(),
  };
}

export async function listGendersPaged(page: number, pageSize: number) {
  const offset = (page - 1) * pageSize;
  return genderRepo.listGendersPaged({ limit: pageSize, offset });
}

export async function getGender(id: number) {
  const gender = await genderRepo.getGenderById(id);
  if (!gender) {
    throw new GenderNotFoundError();
  }
  return gender;
}

export async function createGender(input: GenderInput, actor: ActorContext) {
  assertValid(input);
  const values = toInsertableValues(input);
  await assertCodeUnique(values.code);

  const gender = await genderRepo.insertGender(values);

  await recordAuditLog({
    actor: { userId: actor.userId, roleId: actor.roleId },
    permissionCode: actor.permissionCode,
    action: "create",
    entity: "gender",
    entityId: gender.id,
    after: values,
  });

  return gender;
}

export async function updateGenderById(id: number, input: GenderInput, actor: ActorContext) {
  assertValid(input);
  const values = toInsertableValues(input);

  const existing = await genderRepo.getGenderById(id);
  if (!existing) {
    throw new GenderNotFoundError();
  }
  await assertCodeUnique(values.code, id);

  const updated = await genderRepo.updateGender(id, values);
  if (!updated) {
    throw new GenderNotFoundError();
  }

  await recordAuditLog({
    actor: { userId: actor.userId, roleId: actor.roleId },
    permissionCode: actor.permissionCode,
    action: "update",
    entity: "gender",
    entityId: id,
    before: { code: existing.code, label: existing.label },
    after: values,
  });

  return updated;
}

export async function deactivateGenderById(id: number, actor: ActorContext) {
  const existing = await genderRepo.getGenderById(id);
  if (!existing) {
    throw new GenderNotFoundError();
  }

  const deactivated = await genderRepo.deactivateGender(id);
  if (!deactivated) {
    throw new GenderNotFoundError();
  }

  await recordAuditLog({
    actor: { userId: actor.userId, roleId: actor.roleId },
    permissionCode: actor.permissionCode,
    action: "delete",
    entity: "gender",
    entityId: id,
    before: { code: existing.code, label: existing.label },
  });

  return deactivated;
}

export async function reactivateGenderById(id: number, actor: ActorContext) {
  const existing = await genderRepo.getGenderById(id);
  if (!existing) {
    throw new GenderNotFoundError();
  }

  const reactivated = await genderRepo.reactivateGender(id);
  if (!reactivated) {
    throw new GenderNotFoundError();
  }

  await recordAuditLog({
    actor: { userId: actor.userId, roleId: actor.roleId },
    permissionCode: actor.permissionCode,
    action: "update",
    entity: "gender",
    entityId: id,
    before: { deactivated_at: existing.deactivated_at },
    after: { deactivated_at: null },
  });

  return reactivated;
}
