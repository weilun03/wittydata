"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button, Descriptions, Spin, message } from "antd";
import { ProviderForm } from "@/screens/provider/ProviderForm";
import type { ProviderRecord } from "@/screens/provider/types";
import { BackButton } from "@/components/BackButton";

export default function ProviderDetailPage() {
  const params = useParams<{ id: string }>();
  const [provider, setProvider] = useState<ProviderRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | undefined>();

  useEffect(() => {
    fetch(`/api/providers/${params.id}`)
      .then((res) => res.json())
      .then((json) => {
        setProvider(json.data ?? null);
        setLoading(false);
      });
  }, [params.id]);

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

  if (loading) {
    return (
      <div className="p-8">
        <Spin />
      </div>
    );
  }

  if (!provider) {
    return <div className="p-8">Provider not found.</div>;
  }

  return (
    <div className="p-8">
      <BackButton href="/providers" label="Back to Providers" />
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">{provider.name}</h1>
        {!editing && <Button onClick={() => setEditing(true)}>Edit</Button>}
      </div>

      {editing ? (
        <ProviderForm
          initialValues={{
            abn: provider.abn,
            name: provider.name,
            email: provider.email ?? undefined,
            phone_number: provider.phone_number,
            address: provider.address ?? undefined,
            unit_building: provider.unit_building,
          }}
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
