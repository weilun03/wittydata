import type { Permission } from "./types";

export function groupPermissionsByEntity(permissions: Permission[]) {
  const groups = new Map<string, Permission[]>();
  for (const permission of permissions) {
    const [entity] = permission.code.split(".");
    const list = groups.get(entity) ?? [];
    list.push(permission);
    groups.set(entity, list);
  }
  return [...groups.entries()];
}
