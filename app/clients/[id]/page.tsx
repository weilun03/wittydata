"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button, Descriptions, Spin, message, Popconfirm, Space } from "antd";
import dayjs from "dayjs";
import { ClientForm } from "@/modules/client/ClientForm";
import type { ClientRecord, Gender, PricingRegion } from "@/modules/client/types";
import { BackButton } from "@/components/BackButton";
import { NoPermission } from "@/components/NoPermission";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { PERMISSIONS } from "@/lib/permissions";

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loading: permissionsLoading, hasPermission } = useCurrentUser();
  const canRead = hasPermission(PERMISSIONS.CLIENTS_READ);
  const canUpdate = hasPermission(PERMISSIONS.CLIENTS_UPDATE);
  const canDelete = hasPermission(PERMISSIONS.CLIENTS_DELETE);
  const [client, setClient] = useState<ClientRecord | null>(null);
  const [genders, setGenders] = useState<Gender[]>([]);
  const [pricingRegions, setPricingRegions] = useState<PricingRegion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(searchParams.get("edit") === "true");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | undefined>();

  useEffect(() => {
    if (permissionsLoading || !canRead) return;

    Promise.all([
      fetch(`/api/clients/${params.id}`).then((res) => res.json()),
      fetch("/api/genders").then((res) => res.json()),
      fetch("/api/pricing-regions").then((res) => res.json()),
    ]).then(([c, g, r]) => {
      setClient(c.data ?? null);
      setGenders(g.data ?? []);
      setPricingRegions(r.data ?? []);
      setLoading(false);
    });
  }, [params.id, permissionsLoading, canRead]);

  const initialValues = useMemo(() => {
    if (!client) return undefined;
    return {
      first_name: client.first_name,
      last_name: client.last_name,
      gender_id: client.gender_id,
      dob: client.dob ? dayjs(client.dob) : undefined,
      ndis_number: client.ndis_number,
      email: client.email,
      phone_number: client.phone_number,
      address: client.address,
      unit_building: client.unit_building,
      pricing_region: client.pricing_region,
    };
  }, [client]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    setErrorMessage(null);
    setFieldErrors(undefined);
    try {
      const res = await fetch(`/api/clients/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMessage(json.error?.message ?? "Failed to update participant.");
        setFieldErrors(json.error?.details);
        return;
      }
      setClient(json.data);
      setEditing(false);
      message.success("Participant updated.");
    } catch {
      setErrorMessage("Failed to update participant.");
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
        <NoPermission message="You do not have permission to view this participant." />
      </div>
    );
  }

  if (editing && !canUpdate) {
    return (
      <div className="p-8">
        <NoPermission message="You do not have permission to edit this participant." />
      </div>
    );
  }

  if (!client) {
    return <div className="p-8">Participant not found.</div>;
  }

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/clients/${params.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        message.error(json.error?.message ?? "Failed to delete participant.");
        return;
      }
      message.success("Participant deleted.");
      router.push("/clients");
    } catch {
      message.error("Failed to delete participant.");
    }
  };

  return (
    <div className="p-8">
      <BackButton href="/clients" label="Back to Participants" />
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">
          {client.first_name} {client.last_name}
        </h1>
        {!editing && (
          <Space>
            {canUpdate && <Button onClick={() => setEditing(true)}>Edit</Button>}
            {canDelete && (
              <Popconfirm
                title="Delete this participant?"
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
        <ClientForm
          genders={genders}
          pricingRegions={pricingRegions}
          initialValues={initialValues}
          submitLabel="Save Changes"
          submitting={submitting}
          errorMessage={errorMessage}
          fieldErrors={fieldErrors}
          onSubmit={handleSubmit}
        />
      ) : (
        <Descriptions bordered column={1}>
          <Descriptions.Item label="First Name">{client.first_name}</Descriptions.Item>
          <Descriptions.Item label="Last Name">{client.last_name}</Descriptions.Item>
          <Descriptions.Item label="Gender">
            {genders.find((g) => g.id === client.gender_id)?.label ?? client.gender_id}
          </Descriptions.Item>
          <Descriptions.Item label="Date of Birth">{client.dob}</Descriptions.Item>
          <Descriptions.Item label="NDIS Number">{client.ndis_number}</Descriptions.Item>
          <Descriptions.Item label="Email">{client.email}</Descriptions.Item>
          <Descriptions.Item label="Phone Number">{client.phone_number ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="Address">{client.address}</Descriptions.Item>
          <Descriptions.Item label="Unit / Building">{client.unit_building ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="Pricing Region">{client.pricing_region}</Descriptions.Item>
        </Descriptions>
      )}
    </div>
  );
}
