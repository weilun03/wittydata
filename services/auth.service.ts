import * as userRepo from "@/repositories/user.repository";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createSession, destroySession, getCurrentUser } from "@/lib/session";
import { recordAuditLog } from "@/lib/audit";
import { UnauthenticatedError } from "@/lib/rbac";
import { validatePassword, type ValidationErrors } from "@/modules/user/validation";

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid email or password.");
    this.name = "InvalidCredentialsError";
  }
}

export class IncorrectPasswordError extends Error {
  constructor() {
    super("Current password is incorrect.");
    this.name = "IncorrectPasswordError";
  }
}

export class PasswordValidationError extends Error {
  constructor(public details: ValidationErrors) {
    super("Validation failed");
    this.name = "PasswordValidationError";
  }
}

export async function login(email: unknown, password: unknown) {
  if (typeof email !== "string" || typeof password !== "string") {
    throw new InvalidCredentialsError();
  }

  const user = await userRepo.getUserWithRoleByEmail(email.trim());
  if (!user || user.deactivated_at || user.role_id == null) {
    throw new InvalidCredentialsError();
  }

  const passwordRow = await userRepo.getPasswordByUserId(user.id);
  if (!passwordRow || !(await verifyPassword(passwordRow.password_hash, password))) {
    throw new InvalidCredentialsError();
  }

  const session = await createSession(user.id, user.role_id);

  await recordAuditLog({
    actor: { userId: user.id, roleId: user.role_id },
    permissionCode: null,
    action: "create",
    entity: "auth_session",
    entityId: session.id,
  });

  return user;
}

export async function logout() {
  const current = await getCurrentUser();
  const revoked = await destroySession();

  if (current && revoked) {
    await recordAuditLog({
      actor: { userId: current.user.id, roleId: current.role.id },
      permissionCode: null,
      action: "update",
      entity: "auth_session",
      entityId: revoked.id,
      before: { revoked_at: null },
      after: { revoked_at: revoked.revoked_at },
    });
  }
}

export async function changeOwnPassword(currentPassword: unknown, newPassword: unknown) {
  const current = await getCurrentUser();
  if (!current) {
    throw new UnauthenticatedError();
  }

  const passwordRow = await userRepo.getPasswordByUserId(current.user.id);
  if (
    !passwordRow ||
    typeof currentPassword !== "string" ||
    !(await verifyPassword(passwordRow.password_hash, currentPassword))
  ) {
    throw new IncorrectPasswordError();
  }

  const errors = validatePassword(newPassword);
  if (Object.keys(errors).length > 0) {
    throw new PasswordValidationError(errors);
  }

  const newHash = await hashPassword(newPassword as string);
  await userRepo.updatePassword(current.user.id, newHash);

  await recordAuditLog({
    actor: { userId: current.user.id, roleId: current.role.id },
    permissionCode: null,
    action: "update",
    entity: "user_password",
    entityId: current.user.id,
  });
}
