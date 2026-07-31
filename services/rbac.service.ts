import * as roleRepo from "@/repositories/rbac-role.repository";
import { validateRole, type RoleInput, type ValidationErrors } from "@/modules/role/validation";
import { recordAuditLog, type ActorContext } from "@/lib/audit";

export class RoleNotFoundError extends Error {
  constructor() {
    super("Role not found.");
    this.name = "RoleNotFoundError";
  }
}

export class RoleValidationError extends Error {
  constructor(public details: ValidationErrors) {
    super("Validation failed");
    this.name = "RoleValidationError";
  }
}

export class RoleConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RoleConflictError";
  }
}

export class RoleDeletionNotAllowedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RoleDeletionNotAllowedError";
  }
}

function assertValid(input: RoleInput, options?: { requireCode?: boolean }) {
  const errors = validateRole(input, options);
  if (Object.keys(errors).length > 0) {
    throw new RoleValidationError(errors);
  }
}

async function assertPermissionIdsExist(permissionIds: number[]) {
  if (permissionIds.length === 0) return;
  const all = await roleRepo.listAllPermissions();
  const validIds = new Set(all.map((p) => p.id));
  const invalid = permissionIds.filter((id) => !validIds.has(id));
  if (invalid.length > 0) {
    throw new RoleValidationError({ permission_ids: [`Unknown permission id(s): ${invalid.join(", ")}`] });
  }
}

export async function listRoles() {
  return roleRepo.listRoles();
}

export async function listRolesPaged(page: number, pageSize: number) {
  const offset = (page - 1) * pageSize;
  return roleRepo.listRolesPaged({ limit: pageSize, offset });
}

export async function listAllPermissions() {
  return roleRepo.listAllPermissions();
}

export async function getRole(id: number) {
  const role = await roleRepo.getRoleById(id);
  if (!role) {
    throw new RoleNotFoundError();
  }
  return role;
}

export async function getRolePermissions(roleId: number) {
  const role = await roleRepo.getRoleById(roleId);
  if (!role) {
    throw new RoleNotFoundError();
  }
  return roleRepo.listPermissionsForRole(roleId);
}

export async function createRole(input: RoleInput, actor: ActorContext) {
  assertValid(input);
  const code = (input.code as string).trim().toUpperCase();
  const label = (input.label as string).trim();
  const permissionIds = (input.permission_ids as number[] | undefined) ?? [];

  await assertPermissionIdsExist(permissionIds);

  const existingCode = await roleRepo.findRoleByCode(code);
  if (existingCode) {
    throw new RoleConflictError(`A role with code ${code} already exists.`);
  }
  const existingLabel = await roleRepo.findRoleByLabel(label);
  if (existingLabel) {
    throw new RoleConflictError(`A role with label "${label}" already exists.`);
  }

  const role = await roleRepo.insertRole({ code, label });
  if (permissionIds.length > 0) {
    await roleRepo.setRolePermissions(role.id, permissionIds);
  }

  await recordAuditLog({
    actor: { userId: actor.userId, roleId: actor.roleId },
    permissionCode: actor.permissionCode,
    action: "create",
    entity: "rbac_role",
    entityId: role.id,
    after: { code, label, permission_ids: permissionIds },
  });

  return role;
}

export async function updateRoleById(id: number, input: RoleInput, actor: ActorContext) {
  assertValid(input, { requireCode: false });
  const label = (input.label as string).trim();
  const permissionIds = (input.permission_ids as number[] | undefined) ?? [];

  await assertPermissionIdsExist(permissionIds);

  const existing = await roleRepo.getRoleById(id);
  if (!existing) {
    throw new RoleNotFoundError();
  }

  const existingLabel = await roleRepo.findRoleByLabel(label, id);
  if (existingLabel) {
    throw new RoleConflictError(`A role with label "${label}" already exists.`);
  }

  const beforePermissions = await roleRepo.listPermissionsForRole(id);
  const beforePermissionIds = beforePermissions.map((p) => p.id).sort((a, b) => a - b);

  const updated = await roleRepo.updateRoleLabel(id, label);
  if (!updated) {
    throw new RoleNotFoundError();
  }
  await roleRepo.setRolePermissions(id, permissionIds);

  await recordAuditLog({
    actor: { userId: actor.userId, roleId: actor.roleId },
    permissionCode: actor.permissionCode,
    action: "update",
    entity: "rbac_role",
    entityId: id,
    before: { label: existing.label, permission_ids: beforePermissionIds },
    after: { label, permission_ids: [...permissionIds].sort((a, b) => a - b) },
  });

  return updated;
}

export async function deactivateRoleById(id: number, actor: ActorContext) {
  const existing = await roleRepo.getRoleById(id);
  if (!existing) {
    throw new RoleNotFoundError();
  }
  if (existing.is_default) {
    throw new RoleDeletionNotAllowedError("The default Super Admin role cannot be deactivated.");
  }

  const deactivated = await roleRepo.deactivateRole(id);
  if (!deactivated) {
    throw new RoleNotFoundError();
  }

  await recordAuditLog({
    actor: { userId: actor.userId, roleId: actor.roleId },
    permissionCode: actor.permissionCode,
    action: "delete",
    entity: "rbac_role",
    entityId: id,
    before: { code: existing.code, label: existing.label },
  });

  return deactivated;
}

export async function reactivateRoleById(id: number, actor: ActorContext) {
  const existing = await roleRepo.getRoleById(id);
  if (!existing) {
    throw new RoleNotFoundError();
  }

  const reactivated = await roleRepo.reactivateRole(id);
  if (!reactivated) {
    throw new RoleNotFoundError();
  }

  await recordAuditLog({
    actor: { userId: actor.userId, roleId: actor.roleId },
    permissionCode: actor.permissionCode,
    action: "update",
    entity: "rbac_role",
    entityId: id,
    before: { deactivated_at: existing.deactivated_at },
    after: { deactivated_at: null },
  });

  return reactivated;
}
