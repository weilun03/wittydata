import { Checkbox, Space } from "antd";
import type { Permission } from "./types";

interface PermissionCardGridProps {
  groups: (readonly [string, Permission[]])[];
}

export function PermissionCardGrid({ groups }: PermissionCardGridProps) {
  return (
    <div
      className="grid gap-3"
      style={{ width: "100%", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}
    >
      {groups.map(([entity, perms]) => (
        <div key={entity} className="border rounded p-3">
          <div className="font-medium capitalize mb-2 pb-2 border-b">
            {entity.replace(/_/g, " ")}
          </div>
          <Space orientation="vertical" size={4}>
            {perms.map((permission) => (
              <Checkbox key={permission.id} value={permission.id}>
                {permission.label}
              </Checkbox>
            ))}
          </Space>
        </div>
      ))}
    </div>
  );
}
