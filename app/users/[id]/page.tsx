"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button, Descriptions, Spin, message, Popconfirm, Space } from "antd";
import { UserForm } from "@/modules/user/UserForm";
import type { UserRecord, Role } from "@/modules/user/types";
import { BackButton } from "@/components/BackButton";
import { NoPermission } from "@/components/NoPermission";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { PERMISSIONS } from "@/lib/permissions";

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loading: permissionsLoading, hasPermission } = useCurrentUser();
  const canRead = hasPermission(PERMISSIONS.USERS_READ);
  const canUpdate = hasPermission(PERMISSIONS.USERS_UPDATE);
  const canDelete = hasPermission(PERMISSIONS.USERS_DELETE);
  const [user, setUser] = useState<UserRecord | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(searchParams.get("edit") === "true");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | undefined>();

  useEffect(() => {
    if (permissionsLoading || !canRead) return;

    Promise.all([
      fetch(`/api/users/${params.id}`).then((res) => res.json()),
      fetch("/api/roles").then((res) => res.json()),
    ]).then(([userJson, rolesJson]) => {
      setUser(userJson.data ?? null);
      setRoles(rolesJson.data ?? []);
      setLoading(false);
    });
  }, [params.id, permissionsLoading, canRead]);

  const initialValues = useMemo(() => {
    if (!user) return undefined;
    return {
      email: user.email,
      full_name: user.full_name,
      role_id: user.role_id ?? undefined,
    };
  }, [user]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    setErrorMessage(null);
    setFieldErrors(undefined);
    try {
      const res = await fetch(`/api/users/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMessage(json.error?.message ?? "Failed to update user.");
        setFieldErrors(json.error?.details);
        return;
      }
      setUser(json.data);
      setEditing(false);
      message.success("User updated.");
    } catch {
      setErrorMessage("Failed to update user.");
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
        <NoPermission message="You do not have permission to view this user." />
      </div>
    );
  }

  if (editing && !canUpdate) {
    return (
      <div className="p-8">
        <NoPermission message="You do not have permission to edit this user." />
      </div>
    );
  }

  if (!user) {
    return <div className="p-8">User not found.</div>;
  }

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/users/${params.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        message.error(json.error?.message ?? "Failed to delete user.");
        return;
      }
      message.success("User deleted.");
      router.push("/users");
    } catch {
      message.error("Failed to delete user.");
    }
  };

  return (
    <div className="p-8">
      <BackButton href="/users" label="Back to Users" />
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">{user.full_name}</h1>
        {!editing && (
          <Space>
            {canUpdate && <Button onClick={() => setEditing(true)}>Edit</Button>}
            {canDelete && !user.is_default && (
              <Popconfirm
                title="Delete this user?"
                okText="Delete"
                okButtonProps={{ danger: true }}
                onConfirm={handleDelete}
              >
                <Button danger>Delete</Button>
              </Popconfirm>
            )}
          </Space>
        )}
      </div>

      {editing ? (
        <UserForm
          roles={roles}
          initialValues={initialValues}
          submitLabel="Save Changes"
          submitting={submitting}
          errorMessage={errorMessage}
          fieldErrors={fieldErrors}
          onSubmit={handleSubmit}
        />
      ) : (
        <Descriptions bordered column={1}>
          <Descriptions.Item label="Full Name">{user.full_name}</Descriptions.Item>
          <Descriptions.Item label="Email">{user.email}</Descriptions.Item>
          <Descriptions.Item label="Role">{user.role_label ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="Status">
            {user.deactivated_at ? "Deactivated" : "Active"}
          </Descriptions.Item>
        </Descriptions>
      )}
    </div>
  );
}
