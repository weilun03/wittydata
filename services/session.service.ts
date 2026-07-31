import * as sessionRepo from "@/repositories/auth-session.repository";
import { recordAuditLog, type ActorContext } from "@/lib/audit";

export class SessionNotFoundError extends Error {
  constructor() {
    super("Session not found.");
    this.name = "SessionNotFoundError";
  }
}

export async function listSessionsPaged(page: number, pageSize: number, userId?: number) {
  const offset = (page - 1) * pageSize;
  return sessionRepo.listSessions({ limit: pageSize, offset, userId });
}

export async function revokeSession(id: string, actor: ActorContext) {
  const revoked = await sessionRepo.revokeSessionById(id);
  if (!revoked) {
    throw new SessionNotFoundError();
  }

  await recordAuditLog({
    actor: { userId: actor.userId, roleId: actor.roleId },
    permissionCode: actor.permissionCode,
    action: "update",
    entity: "auth_session",
    entityId: id,
    before: { revoked_at: null },
    after: { revoked_at: revoked.revoked_at },
  });

  // Whitelist fields explicitly — never return token_hash, it's secret material.
  return {
    id: revoked.id,
    user_id: revoked.user_id,
    role_id: revoked.role_id,
    user_agent: revoked.user_agent,
    ip: revoked.ip,
    expires_at: revoked.expires_at,
    revoked_at: revoked.revoked_at,
    created_at: revoked.created_at,
  };
}

export async function deleteSession(id: string, actor: ActorContext) {
  const existing = await sessionRepo.getSessionById(id);
  if (!existing) {
    throw new SessionNotFoundError();
  }

  await sessionRepo.deleteSessionById(id);

  await recordAuditLog({
    actor: { userId: actor.userId, roleId: actor.roleId },
    permissionCode: actor.permissionCode,
    action: "delete",
    entity: "auth_session",
    entityId: id,
    before: { user_id: existing.user_id, role_id: existing.role_id },
  });
}
