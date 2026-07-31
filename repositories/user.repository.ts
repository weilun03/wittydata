import { sql, type Insertable, type Updateable } from "kysely";
import { db } from "@/lib/db";
import type { AppUserTable } from "@/db/types";

const activeUsers = () => db.selectFrom("app_user").where("deleted_at", "is", null);

// A user managed through this app always has 0 or 1 role (see setUserRole), so ordering
// by earliest assignment just makes the join result deterministic if that ever changes.
const withRole = <DB extends ReturnType<typeof activeUsers>>(query: DB) =>
  query
    .leftJoin("rbac_user_role", "rbac_user_role.user_id", "app_user.id")
    .leftJoin("rbac_role", "rbac_role.id", "rbac_user_role.role_id")
    .orderBy("rbac_user_role.created_at", "asc")
    .select([
      "app_user.id",
      "app_user.email",
      "app_user.full_name",
      "app_user.is_default",
      "app_user.created_at",
      "app_user.updated_at",
      "app_user.deactivated_at",
      "rbac_role.id as role_id",
      "rbac_role.label as role_label",
    ]);

export async function listUsers({ limit, offset }: { limit: number; offset: number }) {
  const [rows, totalRow] = await Promise.all([
    withRole(activeUsers()).orderBy("app_user.id", "desc").limit(limit).offset(offset).execute(),
    activeUsers()
      .select(({ fn }) => fn.countAll<string>().as("count"))
      .executeTakeFirstOrThrow(),
  ]);

  return { rows, total: Number(totalRow.count) };
}

export async function getUserById(id: number) {
  return withRole(activeUsers()).where("app_user.id", "=", id).executeTakeFirst();
}

export async function getUserByEmail(email: string) {
  return activeUsers().selectAll().where("email", "=", email).executeTakeFirst();
}

// Used at login: resolves the user together with the single role their session should bind to.
export async function getUserWithRoleByEmail(email: string) {
  return withRole(activeUsers()).where("app_user.email", "=", email).executeTakeFirst();
}

export async function insertUser(values: Insertable<AppUserTable>) {
  return db.insertInto("app_user").values(values).returningAll().executeTakeFirstOrThrow();
}

// Creates the app_user row together with its password and role assignment atomically,
// so a failure partway through never leaves a user that can't log in or has no role.
export async function createUserWithPasswordAndRole(
  values: Insertable<AppUserTable>,
  passwordHash: string,
  roleId: number,
) {
  return db.transaction().execute(async (trx) => {
    const user = await trx.insertInto("app_user").values(values).returningAll().executeTakeFirstOrThrow();
    await trx.insertInto("auth_password").values({ user_id: user.id, password_hash: passwordHash }).execute();
    await trx.insertInto("rbac_user_role").values({ user_id: user.id, role_id: roleId }).execute();
    return user;
  });
}

export async function updateUser(id: number, values: Updateable<AppUserTable>) {
  return db
    .updateTable("app_user")
    .set({ ...values, updated_at: sql`now()` })
    .where("id", "=", id)
    .where("deleted_at", "is", null)
    .returningAll()
    .executeTakeFirst();
}

// Replaces whatever role(s) the user currently has with exactly one, matching the
// single role_id field the user-management UI edits (rbac_user_role is many-to-many
// at the schema level, but this app only ever assigns one role per user).
export async function setUserRole(userId: number, roleId: number) {
  await db.transaction().execute(async (trx) => {
    await trx.deleteFrom("rbac_user_role").where("user_id", "=", userId).execute();
    await trx.insertInto("rbac_user_role").values({ user_id: userId, role_id: roleId }).execute();
  });
}

export async function deleteUser(id: number) {
  return db
    .updateTable("app_user")
    .set({ deleted_at: sql`now()` })
    .where("id", "=", id)
    .where("deleted_at", "is", null)
    .returningAll()
    .executeTakeFirst();
}

export async function insertPassword(userId: number, passwordHash: string) {
  await db.insertInto("auth_password").values({ user_id: userId, password_hash: passwordHash }).execute();
}

export async function getPasswordByUserId(userId: number) {
  return db.selectFrom("auth_password").selectAll().where("user_id", "=", userId).executeTakeFirst();
}

export async function updatePassword(userId: number, passwordHash: string) {
  await db
    .updateTable("auth_password")
    .set({ password_hash: passwordHash, password_updated_at: sql`now()` })
    .where("user_id", "=", userId)
    .execute();
}
