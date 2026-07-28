"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { message } from "antd";
import { ProviderForm } from "@/app/_screens/provider/ProviderForm";
import { BackButton } from "@/app/_components/BackButton";

export default function NewProviderPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | undefined>();

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    setErrorMessage(null);
    setFieldErrors(undefined);
    try {
      const res = await fetch("/api/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMessage(json.error?.message ?? "Failed to create provider.");
        setFieldErrors(json.error?.details);
        return;
      }
      message.success("Provider created.");
      router.push(`/providers/${json.data.id}`);
    } catch {
      setErrorMessage("Failed to create provider.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8">
      <BackButton href="/providers" label="Back to Providers" />
      <h1 className="text-2xl font-semibold mb-4">New Provider</h1>
      <ProviderForm
        submitLabel="Create Provider"
        submitting={submitting}
        errorMessage={errorMessage}
        fieldErrors={fieldErrors}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
