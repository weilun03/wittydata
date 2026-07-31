"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Button, Descriptions, Spin, message, Popconfirm, Space, Tag } from "antd";
import { GenderForm } from "@/modules/gender/GenderForm";
import type { GenderRecord } from "@/modules/gender/types";
import { BackButton } from "@/components/BackButton";
import { NoPermission } from "@/components/NoPermission";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { PERMISSIONS } from "@/lib/permissions";

export default function GenderDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { loading: permissionsLoading, hasPermission } = useCurrentUser();
  const canRead = hasPermission(PERMISSIONS.GENDERS_READ);
  const canUpdate = hasPermission(PERMISSIONS.GENDERS_UPDATE);
  const canDelete = hasPermission(PERMISSIONS.GENDERS_DELETE);
  const [gender, setGender] = useState<GenderRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(searchParams.get("edit") === "true");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | undefined>();

  useEffect(() => {
    if (permissionsLoading || !canRead) return;

    fetch(`/api/genders/${params.id}`)
      .then((res) => res.json())
      .then((json) => {
        setGender(json.data ?? null);
        setLoading(false);
      });
  }, [params.id, permissionsLoading, canRead]);

  const initialValues = useMemo(() => {
    if (!gender) return undefined;
    return { code: gender.code, label: gender.label };
  }, [gender]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    setErrorMessage(null);
    setFieldErrors(undefined);
    try {
      const res = await fetch(`/api/genders/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMessage(json.error?.message ?? "Failed to update gender.");
        setFieldErrors(json.error?.details);
        return;
      }
      setGender(json.data);
      setEditing(false);
      message.success("Gender updated.");
    } catch {
      setErrorMessage("Failed to update gender.");
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
        <NoPermission message="You do not have permission to view this gender." />
      </div>
    );
  }

  if (editing && !canUpdate) {
    return (
      <div className="p-8">
        <NoPermission message="You do not have permission to edit this gender." />
      </div>
    );
  }

  if (!gender) {
    return <div className="p-8">Gender not found.</div>;
  }

  const handleDeactivate = async () => {
    try {
      const res = await fetch(`/api/genders/${params.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        message.error(json.error?.message ?? "Failed to deactivate gender.");
        return;
      }
      setGender(json.data);
      message.success("Gender deactivated.");
    } catch {
      message.error("Failed to deactivate gender.");
    }
  };

  const handleReactivate = async () => {
    try {
      const res = await fetch(`/api/genders/${params.id}/reactivate`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        message.error(json.error?.message ?? "Failed to reactivate gender.");
        return;
      }
      setGender(json.data);
      message.success("Gender reactivated.");
    } catch {
      message.error("Failed to reactivate gender.");
    }
  };

  return (
    <div className="p-8">
      <BackButton href="/genders" label="Back to Genders" />
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">
          {gender.label}{" "}
          {gender.deactivated_at ? (
            <Tag color="default">Deactivated</Tag>
          ) : (
            <Tag color="green">Active</Tag>
          )}
        </h1>
        {!editing && (
          <Space>
            {canUpdate && <Button onClick={() => setEditing(true)}>Edit</Button>}
            {gender.deactivated_at
              ? canUpdate && <Button onClick={handleReactivate}>Reactivate</Button>
              : canDelete && (
                  <Popconfirm
                    title="Deactivate this gender?"
                    okText="Deactivate"
                    okButtonProps={{ danger: true }}
                    onConfirm={handleDeactivate}
                  >
                    <Button danger>Deactivate</Button>
                  </Popconfirm>
                )}
          </Space>
        )}
      </div>

      {editing ? (
        <GenderForm
          initialValues={initialValues}
          submitLabel="Save Changes"
          submitting={submitting}
          errorMessage={errorMessage}
          fieldErrors={fieldErrors}
          onSubmit={handleSubmit}
        />
      ) : (
        <Descriptions bordered column={1}>
          <Descriptions.Item label="Code">{gender.code}</Descriptions.Item>
          <Descriptions.Item label="Label">{gender.label}</Descriptions.Item>
          <Descriptions.Item label="Status">
            {gender.deactivated_at ? "Deactivated" : "Active"}
          </Descriptions.Item>
        </Descriptions>
      )}
    </div>
  );
}
