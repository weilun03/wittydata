"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { message, Spin } from "antd";
import { GenderForm } from "@/modules/gender/GenderForm";
import { BackButton } from "@/components/BackButton";
import { NoPermission } from "@/components/NoPermission";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { PERMISSIONS } from "@/lib/permissions";

export default function NewGenderPage() {
  const router = useRouter();
  const { loading: permissionsLoading, hasPermission } = useCurrentUser();
  const canCreate = hasPermission(PERMISSIONS.GENDERS_CREATE);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | undefined>();

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    setErrorMessage(null);
    setFieldErrors(undefined);
    try {
      const res = await fetch("/api/genders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMessage(json.error?.message ?? "Failed to create gender.");
        setFieldErrors(json.error?.details);
        return;
      }
      message.success("Gender created.");
      router.push(`/genders/${json.data.id}`);
    } catch {
      setErrorMessage("Failed to create gender.");
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
        <NoPermission message="You do not have permission to add genders." />
      </div>
    );
  }

  return (
    <div className="p-8">
      <BackButton href="/genders" label="Back to Genders" />
      <h1 className="text-2xl font-semibold mb-4">New Gender</h1>
      <GenderForm
        submitLabel="Create Gender"
        submitting={submitting}
        errorMessage={errorMessage}
        fieldErrors={fieldErrors}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
