"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { message, Spin } from "antd";
import { RateSetForm } from "@/modules/rate-set/RateSetForm";
import { BackButton } from "@/components/BackButton";
import { NoPermission } from "@/components/NoPermission";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { PERMISSIONS } from "@/lib/permissions";

export default function NewRateSetPage() {
  const router = useRouter();
  const { loading: permissionsLoading, hasPermission } = useCurrentUser();
  const canCreate = hasPermission(PERMISSIONS.RATE_SETS_CREATE);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | undefined>();

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    setErrorMessage(null);
    setFieldErrors(undefined);
    try {
      const res = await fetch("/api/rate-sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMessage(json.error?.message ?? "Failed to create rate set.");
        setFieldErrors(json.error?.details);
        return;
      }
      message.success("Rate set created.");
      router.push(`/rate-sets/${json.data.id}`);
    } catch {
      setErrorMessage("Failed to create rate set.");
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
        <NoPermission message="You do not have permission to add rate sets." />
      </div>
    );
  }

  return (
    <div className="p-8">
      <BackButton href="/rate-sets" label="Back to Rate Sets" />
      <h1 className="text-2xl font-semibold mb-4">New Rate Set</h1>
      <RateSetForm
        submitLabel="Create Rate Set"
        submitting={submitting}
        errorMessage={errorMessage}
        fieldErrors={fieldErrors}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
