import * as userRepo from "@/repositories/user.repository";
import * as roleRepo from "@/repositories/rbac-role.repository";
import { hashPassword } from "@/lib/password";
import { recordAuditLog, type ActorContext } from "@/lib/audit";
import { validateUser, validatePassword, type UserInput, type ValidationErrors } from "@/modules/user/validation";

export class UserValidationError extends Error {
  constructor(public details: ValidationErrors) {
    super("Validation failed");
    this.name = "UserValidationError";
  }
}

export class UserConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserConflictError";
  }
}

export class UserNotFoundError extends Error {
  constructor() {
    super("User not found.");
    this.name = "UserNotFoundError";
  }
}

export class UserDeletionNotAllowedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserDeletionNotAllowedError";
  }
}

function assertValid(input: UserInput) {
  const errors = validateUser(input);
  if (Object.keys(errors).length > 0) {
    throw new UserValidationError(errors);
  }
}

async function assertRoleExists(roleId: number) {
  const role = await roleRepo.getRoleById(roleId);
  if (!role) {
    throw new UserValidationError({ role_id: ["Selected role does not exist."] });
  }
}

async function assertEmailUnique(email: string, excludeId?: number) {
  const existing = await userRepo.getUserByEmail(email);
  if (existing && existing.id !== excludeId) {
    throw new UserConflictError(`A user with email ${email} already exists.`);
  }
}

function toRecordValues(input: UserInput) {
  return {
    email: (input.email as string).trim(),
    full_name: (input.full_name as string).trim(),
  };
}

export async function listUsersPaged(page: number, pageSize: number) {
  const offset = (page - 1) * pageSize;
  return userRepo.listUsers({ limit: pageSize, offset });
}

export async function getUser(id: number) {
  const user = await userRepo.getUserById(id);
  if (!user) {
    throw new UserNotFoundError();
  }
  return user;
}

export async function createUser(input: UserInput, password: unknown, actor: ActorContext) {
  assertValid(input);
  const passwordErrors = validatePassword(password);
  if (Object.keys(passwordErrors).length > 0) {
    throw new UserValidationError(passwordErrors);
  }

  const roleId = input.role_id as number;
  await assertRoleExists(roleId);
  await assertEmailUnique(input.email as string);

  const passwordHash = await hashPassword(password as string);
  const user = await userRepo.createUserWithPasswordAndRole(toRecordValues(input), passwordHash, roleId);

  await recordAuditLog({
    actor: { userId: actor.userId, roleId: actor.roleId },
    permissionCode: actor.permissionCode,
    action: "create",
    entity: "user",
    entityId: user.id,
    after: { email: user.email, full_name: user.full_name, role_id: roleId },
  });

  return user;
}

export async function updateUserById(id: number, input: UserInput, actor: ActorContext) {
  assertValid(input);

  const roleId = input.role_id as number;
  await assertRoleExists(roleId);
  await assertEmailUnique(input.email as string, id);

  const before = await userRepo.getUserById(id);
  if (!before) {
    throw new UserNotFoundError();
  }

  const updated = await userRepo.updateUser(id, toRecordValues(input));
  if (!updated) {
    throw new UserNotFoundError();
  }
  await userRepo.setUserRole(id, roleId);

  await recordAuditLog({
    actor: { userId: actor.userId, roleId: actor.roleId },
    permissionCode: actor.permissionCode,
    action: "update",
    entity: "user",
    entityId: id,
    before: { email: before.email, full_name: before.full_name, role_id: before.role_id },
    after: { email: updated.email, full_name: updated.full_name, role_id: roleId },
  });

  return { ...updated, role_id: roleId };
}

export async function deleteUserById(id: number, actor: ActorContext) {
  const existing = await userRepo.getUserById(id);
  if (!existing) {
    throw new UserNotFoundError();
  }

  // Two footguns worth blocking outright: deleting the account you're currently signed
  // in as (locks you out mid-session), and deleting the seeded fallback Super Admin
  // (is_default) that every environment needs at least one working login for.
  if (existing.is_default) {
    throw new UserDeletionNotAllowedError("The default Super Admin account cannot be deleted.");
  }
  if (existing.id === actor.userId) {
    throw new UserDeletionNotAllowedError("You cannot delete your own account.");
  }

  const deleted = await userRepo.deleteUser(id);
  if (!deleted) {
    throw new UserNotFoundError();
  }

  await recordAuditLog({
    actor: { userId: actor.userId, roleId: actor.roleId },
    permissionCode: actor.permissionCode,
    action: "delete",
    entity: "user",
    entityId: id,
    before: { email: existing.email, full_name: existing.full_name, role_id: existing.role_id },
  });
}
