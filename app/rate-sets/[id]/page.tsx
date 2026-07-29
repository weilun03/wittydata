"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button, Descriptions, Spin, message } from "antd";
import dayjs from "dayjs";
import { RateSetForm } from "@/modules/rate-set/RateSetForm";
import type { RateSetRecord } from "@/modules/rate-set/types";
import { ImportPanel } from "@/modules/rate-set-import/ImportPanel";
import { BackButton } from "@/components/BackButton";

export default function RateSetDetailPage() {
  const params = useParams<{ id: string }>();
  const [rateSet, setRateSet] = useState<RateSetRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | undefined>();

  useEffect(() => {
    fetch(`/api/rate-sets/${params.id}`)
      .then((res) => res.json())
      .then((json) => {
        setRateSet(json.data ?? null);
        setLoading(false);
      });
  }, [params.id]);

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

  if (loading) {
    return (
      <div className="p-8">
        <Spin />
      </div>
    );
  }

  if (!rateSet) {
    return <div className="p-8">Rate set not found.</div>;
  }

  return (
    <div className="p-8">
      <BackButton href="/rate-sets" label="Back to Rate Sets" />
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">{rateSet.name}</h1>
        {!editing && <Button onClick={() => setEditing(true)}>Edit</Button>}
      </div>

      {editing ? (
        <RateSetForm
          initialValues={{
            name: rateSet.name,
            description: rateSet.description,
            start_date: dayjs(rateSet.start_date),
            end_date: rateSet.end_date ? dayjs(rateSet.end_date) : undefined,
          }}
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
            {dayjs(rateSet.start_date).format("YYYY-MM-DD")}
          </Descriptions.Item>
          <Descriptions.Item label="End Date">
            {rateSet.end_date ? dayjs(rateSet.end_date).format("YYYY-MM-DD") : "-"}
          </Descriptions.Item>
        </Descriptions>
      )}

      {!editing && (
        <div className="mt-8">
          <ImportPanel rateSetId={rateSet.id} />
        </div>
      )}
    </div>
  );
}
