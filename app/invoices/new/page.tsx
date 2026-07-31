"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { message, Spin } from "antd";
import { InvoiceForm } from "@/modules/invoice/InvoiceForm";
import { BackButton } from "@/components/BackButton";
import { NoPermission } from "@/components/NoPermission";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { PERMISSIONS } from "@/lib/permissions";

export default function NewInvoicePage() {
  const router = useRouter();
  const { loading: permissionsLoading, hasPermission } = useCurrentUser();
  const canCreate = hasPermission(PERMISSIONS.INVOICES_CREATE);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | undefined>();

  const handleSubmit = async (values: Record<string, unknown>, status: "drafted" | "completed") => {
    setSubmitting(true);
    setErrorMessage(null);
    setFieldErrors(undefined);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMessage(json.error?.message ?? "Failed to create invoice.");
        setFieldErrors(json.error?.details);
        return;
      }
      message.success(status === "completed" ? "Invoice saved." : "Draft saved.");
      router.push(`/invoices/${json.data.id}`);
    } catch {
      setErrorMessage("Failed to create invoice.");
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
        <NoPermission message="You do not have permission to add invoices." />
      </div>
    );
  }

  return (
    <div className="p-8">
      <BackButton href="/invoices" label="Back to Invoices" />
      <h1 className="text-2xl font-semibold mb-4">New Invoice</h1>
      <InvoiceForm
        submitting={submitting}
        errorMessage={errorMessage}
        fieldErrors={fieldErrors}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
