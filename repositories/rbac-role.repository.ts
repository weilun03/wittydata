import { sql } from "kysely";
import { db } from "@/lib/db";

export async function listRoles() {
  return db
    .selectFrom("rbac_role")
    .selectAll()
    .where("deactivated_at", "is", null)
    .orderBy("id", "asc")
    .execute();
}

// Admin management view: unlike listRoles() (used to populate the role_id dropdown on
// the user form), this includes deactivated roles too, plus a permission count per role.
export async function listRolesPaged({ limit, offset }: { limit: number; offset: number }) {
  const [rows, totalRow] = await Promise.all([
    db
      .selectFrom("rbac_role")
      .leftJoin("rbac_user_role_permission", "rbac_user_role_permission.role_id", "rbac_role.id")
      .select(({ fn }) => [
        "rbac_role.id",
        "rbac_role.code",
        "rbac_role.label",
        "rbac_role.is_default",
        "rbac_role.created_at",
        "rbac_role.updated_at",
        "rbac_role.deactivated_at",
        fn.count<string>("rbac_user_role_permission.permission_id").distinct().as("permission_count"),
      ])
      .groupBy(["rbac_role.id"])
      .orderBy("rbac_role.id", "asc")
      .limit(limit)
      .offset(offset)
      .execute(),
    db
      .selectFrom("rbac_role")
      .select(({ fn }) => fn.countAll<string>().as("count"))
      .executeTakeFirstOrThrow(),
  ]);

  return { rows, total: Number(totalRow.count) };
}

export async function getRoleById(id: number) {
  return db.selectFrom("rbac_role").selectAll().where("id", "=", id).executeTakeFirst();
}

export async function findRoleByCode(code: string, excludeId?: number) {
  let query = db.selectFrom("rbac_role").selectAll().where("code", "=", code);
  if (excludeId != null) {
    query = query.where("id", "!=", excludeId);
  }
  return query.executeTakeFirst();
}

export async function findRoleByLabel(label: string, excludeId?: number) {
  let query = db.selectFrom("rbac_role").selectAll().where("label", "=", label);
  if (excludeId != null) {
    query = query.where("id", "!=", excludeId);
  }
  return query.executeTakeFirst();
}

export async function insertRole(values: { code: string; label: string }) {
  return db.insertInto("rbac_role").values(values).returningAll().executeTakeFirstOrThrow();
}

export async function updateRoleLabel(id: number, label: string) {
  return db
    .updateTable("rbac_role")
    .set({ label, updated_at: sql`now()` })
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
}

export async function deactivateRole(id: number) {
  return db
    .updateTable("rbac_role")
    .set({ deactivated_at: sql`now()` })
    .where("id", "=", id)
    .where("deactivated_at", "is", null)
    .returningAll()
    .executeTakeFirst();
}

export async function reactivateRole(id: number) {
  return db
    .updateTable("rbac_role")
    .set({ deactivated_at: null })
    .where("id", "=", id)
    .where("deactivated_at", "is not", null)
    .returningAll()
    .executeTakeFirst();
}

export async function countUsersWithRole(roleId: number) {
  const row = await db
    .selectFrom("rbac_user_role")
    .innerJoin("app_user", "app_user.id", "rbac_user_role.user_id")
    .select(({ fn }) => fn.countAll<string>().as("count"))
    .where("rbac_user_role.role_id", "=", roleId)
    .where("app_user.deleted_at", "is", null)
    .executeTakeFirstOrThrow();
  return Number(row.count);
}

export async function listAllPermissions() {
  return db.selectFrom("rbac_permission").selectAll().orderBy("code", "asc").execute();
}

export async function listPermissionsForRole(roleId: number) {
  return db
    .selectFrom("rbac_user_role_permission")
    .innerJoin("rbac_permission", "rbac_permission.id", "rbac_user_role_permission.permission_id")
    .select(["rbac_permission.id", "rbac_permission.code", "rbac_permission.label"])
    .where("rbac_user_role_permission.role_id", "=", roleId)
    .orderBy("rbac_permission.code", "asc")
    .execute();
}

// Replaces the role's entire permission set with `permissionIds` in one transaction.
export async function setRolePermissions(roleId: number, permissionIds: number[]) {
  await db.transaction().execute(async (trx) => {
    await trx.deleteFrom("rbac_user_role_permission").where("role_id", "=", roleId).execute();
    if (permissionIds.length > 0) {
      await trx
        .insertInto("rbac_user_role_permission")
        .values(permissionIds.map((permissionId) => ({ role_id: roleId, permission_id: permissionId })))
        .execute();
    }
  });
}
