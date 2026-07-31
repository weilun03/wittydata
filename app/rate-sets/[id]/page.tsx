"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button, Descriptions, Spin, message, Popconfirm, Space } from "antd";
import { RateSetForm } from "@/modules/rate-set/RateSetForm";
import type { RateSetRecord } from "@/modules/rate-set/types";
import { ImportPanel } from "@/modules/rate-set-import/ImportPanel";
import { BackButton } from "@/components/BackButton";
import { formatUtcDate, parseUtcDate } from "@/lib/dates";
import { NoPermission } from "@/components/NoPermission";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { PERMISSIONS } from "@/lib/permissions";

export default function RateSetDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loading: permissionsLoading, hasPermission } = useCurrentUser();
  const canRead = hasPermission(PERMISSIONS.RATE_SETS_READ);
  const canUpdate = hasPermission(PERMISSIONS.RATE_SETS_UPDATE);
  const canDelete = hasPermission(PERMISSIONS.RATE_SETS_DELETE);
  const canImport = hasPermission(PERMISSIONS.RATE_SETS_IMPORT);
  const [rateSet, setRateSet] = useState<RateSetRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(searchParams.get("edit") === "true");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | undefined>();

  useEffect(() => {
    if (permissionsLoading || !canRead) return;

    fetch(`/api/rate-sets/${params.id}`)
      .then((res) => res.json())
      .then((json) => {
        setRateSet(json.data ?? null);
        setLoading(false);
      });
  }, [params.id, permissionsLoading, canRead]);

  const initialValues = useMemo(() => {
    if (!rateSet) return undefined;
    return {
      name: rateSet.name,
      description: rateSet.description,
      start_date: parseUtcDate(rateSet.start_date),
      end_date: parseUtcDate(rateSet.end_date),
    };
  }, [rateSet]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    setErrorMessage(null);
    setFieldErrors(undefined);
    try {
      const res = await fetch(`/api/rate-sets/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMessage(json.error?.message ?? "Failed to update rate set.");
        setFieldErrors(json.error?.details);
        return;
      }
      setRateSet(json.data);
      setEditing(false);
      message.success("Rate set updated.");
    } catch {
      setErrorMessage("Failed to update rate set.");
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
        <NoPermission message="You do not have permission to view this rate set." />
      </div>
    );
  }

  if (editing && !canUpdate) {
    return (
      <div className="p-8">
        <NoPermission message="You do not have permission to edit this rate set." />
      </div>
    );
  }

  if (!rateSet) {
    return <div className="p-8">Rate set not found.</div>;
  }

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/rate-sets/${params.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        message.error(json.error?.message ?? "Failed to delete rate set.");
        return;
      }
      message.success("Rate set deleted.");
      router.push("/rate-sets");
    } catch {
      message.error("Failed to delete rate set.");
    }
  };

  return (
    <div className="p-8">
      <BackButton href="/rate-sets" label="Back to Rate Sets" />
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">{rateSet.name}</h1>
        {!editing && (
          <Space>
            {canUpdate && <Button onClick={() => setEditing(true)}>Edit</Button>}
            {canDelete && (
              <Popconfirm
                title="Delete this rate set?"
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
        <RateSetForm
          initialValues={initialValues}
          submitLabel="Save Changes"
          submitting={submitting}
          errorMessage={errorMessage}
          fieldErrors={fieldErrors}
          onSubmit={handleSubmit}
        />
      ) : (
        <Descriptions bordered column={1}>
          <Descriptions.Item label="Name">{rateSet.name}</Descriptions.Item>
          <Descriptions.Item label="Description">{rateSet.description ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="Start Date">
            {formatUtcDate(rateSet.start_date)}
          </Descriptions.Item>
          <Descriptions.Item label="End Date">
            {formatUtcDate(rateSet.end_date) ?? "-"}
          </Descriptions.Item>
        </Descriptions>
      )}

      {!editing && canImport && (
        <div className="mt-8">
          <ImportPanel rateSetId={rateSet.id} />
        </div>
      )}
    </div>
  );
}
