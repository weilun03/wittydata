"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button, Descriptions, Spin, message, Popconfirm, Space } from "antd";
import { ProviderForm } from "@/modules/provider/ProviderForm";
import type { ProviderRecord } from "@/modules/provider/types";
import { BackButton } from "@/components/BackButton";
import { NoPermission } from "@/components/NoPermission";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { PERMISSIONS } from "@/lib/permissions";

export default function ProviderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loading: permissionsLoading, hasPermission } = useCurrentUser();
  const canRead = hasPermission(PERMISSIONS.PROVIDERS_READ);
  const canUpdate = hasPermission(PERMISSIONS.PROVIDERS_UPDATE);
  const canDelete = hasPermission(PERMISSIONS.PROVIDERS_DELETE);
  const [provider, setProvider] = useState<ProviderRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(searchParams.get("edit") === "true");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | undefined>();

  useEffect(() => {
    if (permissionsLoading || !canRead) return;

    fetch(`/api/providers/${params.id}`)
      .then((res) => res.json())
      .then((json) => {
        setProvider(json.data ?? null);
        setLoading(false);
      });
  }, [params.id, permissionsLoading, canRead]);

  const initialValues = useMemo(() => {
    if (!provider) return undefined;
    return {
      abn: provider.abn,
      name: provider.name,
      email: provider.email ?? undefined,
      phone_number: provider.phone_number,
      address: provider.address ?? undefined,
      unit_building: provider.unit_building,
    };
  }, [provider]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    setErrorMessage(null);
    setFieldErrors(undefined);
    try {
      const res = await fetch(`/api/providers/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMessage(json.error?.message ?? "Failed to update provider.");
        setFieldErrors(json.error?.details);
        return;
      }
      setProvider(json.data);
      setEditing(false);
      message.success("Provider updated.");
    } catch {
      setErrorMessage("Failed to update provider.");
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
        <NoPermission message="You do not have permission to view this provider." />
      </div>
    );
  }

  if (editing && !canUpdate) {
    return (
      <div className="p-8">
        <NoPermission message="You do not have permission to edit this provider." />
      </div>
    );
  }

  if (!provider) {
    return <div className="p-8">Provider not found.</div>;
  }

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/providers/${params.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        message.error(json.error?.message ?? "Failed to delete provider.");
        return;
      }
      message.success("Provider deleted.");
      router.push("/providers");
    } catch {
      message.error("Failed to delete provider.");
    }
  };

  return (
    <div className="p-8">
      <BackButton href="/providers" label="Back to Providers" />
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">{provider.name}</h1>
        {!editing && (
          <Space>
            {canUpdate && <Button onClick={() => setEditing(true)}>Edit</Button>}
            {canDelete && (
              <Popconfirm
                title="Delete this provider?"
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
        <ProviderForm
          initialValues={initialValues}
          submitLabel="Save Changes"
          submitting={submitting}
          errorMessage={errorMessage}
          fieldErrors={fieldErrors}
          onSubmit={handleSubmit}
        />
      ) : (
        <Descriptions bordered column={1}>
          <Descriptions.Item label="ABN">{provider.abn}</Descriptions.Item>
          <Descriptions.Item label="Name">{provider.name}</Descriptions.Item>
          <Descriptions.Item label="Email">{provider.email ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="Phone Number">{provider.phone_number ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="Address">{provider.address ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="Unit / Building">{provider.unit_building ?? "-"}</Descriptions.Item>
        </Descriptions>
      )}
    </div>
  );
}
