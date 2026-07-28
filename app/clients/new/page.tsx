"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { message } from "antd";
import { ClientForm } from "@/app/_screens/client/ClientForm";
import type { Gender, PricingRegion } from "@/app/_screens/client/types";
import { BackButton } from "@/app/_components/BackButton";

export default function NewClientPage() {
  const router = useRouter();
  const [genders, setGenders] = useState<Gender[]>([]);
  const [pricingRegions, setPricingRegions] = useState<PricingRegion[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | undefined>();

  useEffect(() => {
    Promise.all([
      fetch("/api/genders").then((res) => res.json()),
      fetch("/api/pricing-regions").then((res) => res.json()),
    ]).then(([g, r]) => {
      setGenders(g.data ?? []);
      setPricingRegions(r.data ?? []);
    });
  }, []);

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    setErrorMessage(null);
    setFieldErrors(undefined);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMessage(json.error?.message ?? "Failed to create participant.");
        setFieldErrors(json.error?.details);
        return;
      }
      message.success("Participant created.");
      router.push(`/clients/${json.data.id}`);
    } catch {
      setErrorMessage("Failed to create participant.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8">
      <BackButton href="/clients" label="Back to Participants" />
      <h1 className="text-2xl font-semibold mb-4">New Participant</h1>
      <ClientForm
        genders={genders}
        pricingRegions={pricingRegions}
        submitLabel="Create Participant"
        submitting={submitting}
        errorMessage={errorMessage}
        fieldErrors={fieldErrors}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
