"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { message, Spin } from "antd";
import { UserForm } from "@/modules/user/UserForm";
import type { Role } from "@/modules/user/types";
import { BackButton } from "@/components/BackButton";
import { NoPermission } from "@/components/NoPermission";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { PERMISSIONS } from "@/lib/permissions";

export default function NewUserPage() {
  const router = useRouter();
  const { loading: permissionsLoading, hasPermission } = useCurrentUser();
  const canCreate = hasPermission(PERMISSIONS.USERS_CREATE);
  const [roles, setRoles] = useState<Role[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | undefined>();

  useEffect(() => {
    fetch("/api/roles")
      .then((res) => res.json())
      .then((json) => setRoles(json.data ?? []));
  }, []);

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    setErrorMessage(null);
    setFieldErrors(undefined);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMessage(json.error?.message ?? "Failed to create user.");
        setFieldErrors(json.error?.details);
        return;
      }
      message.success("User created.");
      router.push(`/users/${json.data.id}`);
    } catch {
      setErrorMessage("Failed to create user.");
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
        <NoPermission message="You do not have permission to add users." />
      </div>
    );
  }

  return (
    <div className="p-8">
      <BackButton href="/users" label="Back to Users" />
      <h1 className="text-2xl font-semibold mb-4">New User</h1>
      <UserForm
        roles={roles}
        showPassword
        submitLabel="Create User"
        submitting={submitting}
        errorMessage={errorMessage}
        fieldErrors={fieldErrors}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
