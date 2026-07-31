import { sql } from "kysely";
import { db } from "@/lib/db";

const sessionsWithUser = (userId?: number) => {
  let query = db
    .selectFrom("auth_session")
    .innerJoin("app_user", "app_user.id", "auth_session.user_id")
    .innerJoin("rbac_role", "rbac_role.id", "auth_session.role_id");

  if (userId !== undefined) {
    query = query.where("auth_session.user_id", "=", userId);
  }

  return query;
};

export async function listSessions({
  limit,
  offset,
  userId,
}: {
  limit: number;
  offset: number;
  userId?: number;
}) {
  const [rows, totalRow] = await Promise.all([
    sessionsWithUser(userId)
      .select([
        "auth_session.id",
        "auth_session.user_id",
        "app_user.email",
        "app_user.full_name",
        "rbac_role.label as role_label",
        "auth_session.user_agent",
        "auth_session.ip",
        "auth_session.expires_at",
        "auth_session.revoked_at",
        "auth_session.created_at",
      ])
      .orderBy("auth_session.created_at", "desc")
      .limit(limit)
      .offset(offset)
      .execute(),
    sessionsWithUser(userId)
      .select(({ fn }) => fn.countAll<string>().as("count"))
      .executeTakeFirstOrThrow(),
  ]);

  return { rows, total: Number(totalRow.count) };
}

export async function getSessionById(id: string) {
  return db.selectFrom("auth_session").selectAll().where("id", "=", id).executeTakeFirst();
}

export async function revokeSessionById(id: string) {
  return db
    .updateTable("auth_session")
    .set({ revoked_at: sql`now()` })
    .where("id", "=", id)
    .where("revoked_at", "is", null)
    .returningAll()
    .executeTakeFirst();
}

export async function deleteSessionById(id: string) {
  const result = await db.deleteFrom("auth_session").where("id", "=", id).executeTakeFirst();
  return result.numDeletedRows > BigInt(0);
}
