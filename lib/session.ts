import { createHash, randomBytes } from "crypto";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { sql } from "kysely";
import { db } from "@/lib/db";

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "ndis_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function requestMeta() {
  const headerList = await headers();
  return {
    userAgent: headerList.get("user-agent"),
    ip: headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  };
}

export async function createSession(userId: number, roleId: number) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const { userAgent, ip } = await requestMeta();

  const session = await db
    .insertInto("auth_session")
    .values({
      user_id: userId,
      role_id: roleId,
      token_hash: hashToken(token),
      user_agent: userAgent,
      ip,
      expires_at: expiresAt,
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return session;
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  let revoked = null;

  if (token) {
    revoked = await db
      .updateTable("auth_session")
      .set({ revoked_at: sql`now()` })
      .where("token_hash", "=", hashToken(token))
      .where("revoked_at", "is", null)
      .returningAll()
      .executeTakeFirst();
  }

  cookieStore.delete(COOKIE_NAME);
  return revoked ?? null;
}

// Cached per request: repeated calls within the same render/route only hit the DB once.
export const getCurrentSession = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await db
    .selectFrom("auth_session")
    .selectAll()
    .where("token_hash", "=", hashToken(token))
    .where("revoked_at", "is", null)
    .where("expires_at", ">", new Date())
    .executeTakeFirst();

  if (!session) {
    // The cookie is left over from an expired/revoked/deleted session. proxy.ts only
    // checks cookie *presence* (an optimistic, cookie-only check — see proxy.ts), so a
    // stale cookie makes it treat the browser as logged in and bounce every attempt to
    // reach /login back to "/". Clearing it here, the moment we discover it's dead, is
    // what breaks that loop.
    cookieStore.delete(COOKIE_NAME);
    return null;
  }

  return session;
});

export const getCurrentUser = cache(async () => {
  const session = await getCurrentSession();
  if (!session) return null;

  const user = await db
    .selectFrom("app_user")
    .selectAll()
    .where("id", "=", session.user_id)
    .where("deleted_at", "is", null)
    .where("deactivated_at", "is", null)
    .executeTakeFirst();
  if (!user) return null;

  const role = await db
    .selectFrom("rbac_role")
    .selectAll()
    .where("id", "=", session.role_id)
    .where("deactivated_at", "is", null)
    .executeTakeFirst();
  if (!role) return null;

  return { user, role, session };
});
