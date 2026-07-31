"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { message, Spin } from "antd";
import { RoleCreateForm } from "@/modules/role/RoleCreateForm";
import type { Permission } from "@/modules/role/types";
import { BackButton } from "@/components/BackButton";
import { NoPermission } from "@/components/NoPermission";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { PERMISSIONS } from "@/lib/permissions";

export default function NewRolePage() {
  const router = useRouter();
  const { loading: permissionsLoading, hasPermission } = useCurrentUser();
  const canCreate = hasPermission(PERMISSIONS.USER_ROLES_CREATE);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | undefined>();

  useEffect(() => {
    fetch("/api/permissions")
      .then((res) => res.json())
      .then((json) => setPermissions(json.data ?? []));
  }, []);

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    setErrorMessage(null);
    setFieldErrors(undefined);
    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMessage(json.error?.message ?? "Failed to create role.");
        setFieldErrors(json.error?.details);
        return;
      }
      message.success("Role created.");
      router.push(`/roles/${json.data.id}`);
    } catch {
      setErrorMessage("Failed to create role.");
    } finally {
      setSubmitting(false);
    }
  };

  if (permissionsLoading) {
    return (
      <div className="p-8">
        <Spin />
      </div>
    );
  }

  if (!canCreate) {
    return (
      <div className="p-8">
        <NoPermission message="You do not have permission to add roles." />
      </div>
    );
  }

  return (
    <div className="p-8">
      <BackButton href="/roles" label="Back to Roles" />
      <h1 className="text-2xl font-semibold mb-4">New Role</h1>
      <RoleCreateForm
        permissions={permissions}
        submitting={submitting}
        errorMessage={errorMessage}
        fieldErrors={fieldErrors}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
