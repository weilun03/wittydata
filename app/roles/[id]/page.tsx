"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Button, Descriptions, Spin, message, Popconfirm, Space, Tag } from "antd";
import { RoleEditForm } from "@/modules/role/RoleEditForm";
import { groupPermissionsByEntity } from "@/modules/role/permission-groups";
import type { RoleRecord, Permission } from "@/modules/role/types";
import { BackButton } from "@/components/BackButton";
import { NoPermission } from "@/components/NoPermission";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { PERMISSIONS } from "@/lib/permissions";

type RoleDetail = RoleRecord & { permission_ids: number[] };

export default function RoleDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { loading: permissionsLoading, hasPermission } = useCurrentUser();
  const canRead = hasPermission(PERMISSIONS.USER_ROLES_READ);
  const canUpdate = hasPermission(PERMISSIONS.USER_ROLES_UPDATE);
  const canDelete = hasPermission(PERMISSIONS.USER_ROLES_DELETE);
  const [role, setRole] = useState<RoleDetail | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(searchParams.get("edit") === "true");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | undefined>();

  useEffect(() => {
    if (permissionsLoading || !canRead) return;

    Promise.all([
      fetch(`/api/roles/${params.id}`).then((res) => res.json()),
      fetch("/api/permissions").then((res) => res.json()),
    ]).then(([roleJson, permsJson]) => {
      setRole(roleJson.data ?? null);
      setPermissions(permsJson.data ?? []);
      setLoading(false);
    });
  }, [params.id, permissionsLoading, canRead]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    setErrorMessage(null);
    setFieldErrors(undefined);
    try {
      const res = await fetch(`/api/roles/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMessage(json.error?.message ?? "Failed to update role.");
        setFieldErrors(json.error?.details);
        return;
      }
      setRole((prev) => (prev ? { ...prev, ...json.data, permission_ids: values.permission_ids as number[] ?? [] } : prev));
      setEditing(false);
      message.success("Role updated.");
    } catch {
      setErrorMessage("Failed to update role.");
    } finally {
      setSubmitting(false);
    }
  };

  if (permissionsLoading || (canRead && loading)) {
    return (
      <div className="p-8">
        <Spin />
      </div>
    );
  }

  if (!canRead) {
    return (
      <div className="p-8">
        <NoPermission message="You do not have permission to view this role." />
      </div>
    );
  }

  if (editing && !canUpdate) {
    return (
      <div className="p-8">
        <NoPermission message="You do not have permission to edit this role." />
      </div>
    );
  }

  if (!role) {
    return <div className="p-8">Role not found.</div>;
  }

  const handleDeactivate = async () => {
    try {
      const res = await fetch(`/api/roles/${params.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        message.error(json.error?.message ?? "Failed to deactivate role.");
        return;
      }
      setRole((prev) => (prev ? { ...prev, deactivated_at: new Date().toISOString() } : prev));
      message.success("Role deactivated.");
    } catch {
      message.error("Failed to deactivate role.");
    }
  };

  const handleReactivate = async () => {
    try {
      const res = await fetch(`/api/roles/${params.id}/reactivate`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        message.error(json.error?.message ?? "Failed to reactivate role.");
        return;
      }
      setRole((prev) => (prev ? { ...prev, deactivated_at: null } : prev));
      message.success("Role reactivated.");
    } catch {
      message.error("Failed to reactivate role.");
    }
  };

  const assignedGroups = groupPermissionsByEntity(permissions)
    .map(([entity, perms]) => [entity, perms.filter((p) => role.permission_ids.includes(p.id))] as const)
    .filter(([, perms]) => perms.length > 0);

  return (
    <div className="p-8">
      <BackButton href="/roles" label="Back to Roles" />
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">
          {role.label}{" "}
          {role.deactivated_at ? (
            <Tag color="default">Deactivated</Tag>
          ) : (
            <Tag color="green">Active</Tag>
          )}
        </h1>
        {!editing && (
          <Space>
            {canUpdate && <Button onClick={() => setEditing(true)}>Edit</Button>}
            {!role.is_default &&
              (role.deactivated_at
                ? canUpdate && <Button onClick={handleReactivate}>Reactivate</Button>
                : canDelete && (
                    <Popconfirm
                      title="Deactivate this role?"
                      okText="Deactivate"
                      okButtonProps={{ danger: true }}
                      onConfirm={handleDeactivate}
                    >
                      <Button danger>Deactivate</Button>
                    </Popconfirm>
                  ))}
          </Space>
        )}
      </div>

      {editing ? (
        <RoleEditForm
          permissions={permissions}
          initialValues={{ label: role.label, permission_ids: role.permission_ids }}
          submitting={submitting}
          errorMessage={errorMessage}
          fieldErrors={fieldErrors}
          onSubmit={handleSubmit}
        />
      ) : (
        <>
          <Descriptions bordered column={1} className="mb-6">
            <Descriptions.Item label="Code">{role.code}</Descriptions.Item>
            <Descriptions.Item label="Label">{role.label}</Descriptions.Item>
            <Descriptions.Item label="Status">
              {role.deactivated_at ? "Deactivated" : "Active"}
            </Descriptions.Item>
          </Descriptions>

          <h2 className="text-lg font-semibold mb-2">
            Permissions ({assignedGroups.reduce((sum, [, perms]) => sum + perms.length, 0)})
          </h2>
          {assignedGroups.length === 0 ? (
            <span className="text-gray-500">No permissions assigned.</span>
          ) : (
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}
            >
              {assignedGroups.map(([entity, perms]) => (
                <div key={entity} className="border rounded p-3">
                  <div className="font-medium capitalize mb-2 pb-2 border-b">
                    {entity.replace(/_/g, " ")}
                  </div>
                  <ul className="list-disc list-outside pl-5 m-0 space-y-1 text-gray-700">
                    {perms.map((permission) => (
                      <li key={permission.id}>{permission.label}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
