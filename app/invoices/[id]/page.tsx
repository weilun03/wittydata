"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button, Descriptions, Spin, Table, Tag, message, Popconfirm, Space } from "antd";
import dayjs from "dayjs";
import { InvoiceForm } from "@/modules/invoice/InvoiceForm";
import type { InvoiceRecord } from "@/modules/invoice/types";
import { BackButton } from "@/components/BackButton";
import { formatUtcDate } from "@/lib/dates";
import { NoPermission } from "@/components/NoPermission";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { PERMISSIONS } from "@/lib/permissions";

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loading: permissionsLoading, hasPermission } = useCurrentUser();
  const canRead = hasPermission(PERMISSIONS.INVOICES_READ);
  const canUpdate = hasPermission(PERMISSIONS.INVOICES_UPDATE);
  const canDelete = hasPermission(PERMISSIONS.INVOICES_DELETE);
  const [invoice, setInvoice] = useState<InvoiceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(searchParams.get("edit") === "true");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | undefined>();

  useEffect(() => {
    if (permissionsLoading || !canRead) return;

    fetch(`/api/invoices/${params.id}`)
      .then((res) => res.json())
      .then((json) => {
        setInvoice(json.data ?? null);
        setLoading(false);
      });
  }, [params.id, permissionsLoading, canRead]);

  const initialValues = useMemo(() => {
    if (!invoice) return undefined;
    return {
      client_id: invoice.client_id ?? undefined,
      provider_id: invoice.provider_id ?? undefined,
      invoice_number: invoice.invoice_number ?? undefined,
      invoice_date: invoice.invoice_date ? dayjs(invoice.invoice_date) : undefined,
      expected_amount: invoice.expected_amount != null ? Number(invoice.expected_amount) : undefined,
      items: invoice.items.map((item) => ({
        key: `existing-${item.id}`,
        category_id: item.category_id ?? undefined,
        support_item_id: item.support_item_id ?? undefined,
        start_date: formatUtcDate(item.start_date),
        end_date: formatUtcDate(item.end_date),
        unit: item.unit != null ? Number(item.unit) : undefined,
        input_rate: item.input_rate != null ? Number(item.input_rate) : undefined,
      })),
    };
  }, [invoice]);

  const handleSubmit = async (values: Record<string, unknown>, status: "drafted" | "completed") => {
    setSubmitting(true);
    setErrorMessage(null);
    setFieldErrors(undefined);
    try {
      const res = await fetch(`/api/invoices/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMessage(json.error?.message ?? "Failed to update invoice.");
        setFieldErrors(json.error?.details);
        return;
      }
      setInvoice(json.data);
      setEditing(false);
      message.success(status === "completed" ? "Invoice saved." : "Draft saved.");
    } catch {
      setErrorMessage("Failed to update invoice.");
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
        <NoPermission message="You do not have permission to view this invoice." />
      </div>
    );
  }

  if (editing && !canUpdate) {
    return (
      <div className="p-8">
        <NoPermission message="You do not have permission to edit this invoice." />
      </div>
    );
  }

  if (!invoice) {
    return <div className="p-8">Invoice not found.</div>;
  }

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/invoices/${params.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        message.error(json.error?.message ?? "Failed to delete invoice.");
        return;
      }
      message.success("Invoice deleted.");
      router.push("/invoices");
    } catch {
      message.error("Failed to delete invoice.");
    }
  };

  return (
    <div className="p-8">
      <BackButton href="/invoices" label="Back to Invoices" />
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">
          {invoice.invoice_number ?? `Invoice #${invoice.id}`}{" "}
          <Tag color={invoice.status === "completed" ? "green" : "orange"}>{invoice.status}</Tag>
        </h1>
        {!editing && (
          <Space>
            {canUpdate && <Button onClick={() => setEditing(true)}>Edit</Button>}
            {canDelete && (
              <Popconfirm
                title="Delete this invoice?"
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
        <InvoiceForm
          initialValues={initialValues}
          submitting={submitting}
          errorMessage={errorMessage}
          fieldErrors={fieldErrors}
          onSubmit={handleSubmit}
        />
      ) : (
        <>
          <Descriptions bordered column={1}>
            <Descriptions.Item label="Invoice Number">{invoice.invoice_number ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="Invoice Date">{invoice.invoice_date ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="Amount">
              {invoice.amount != null ? Number(invoice.amount).toFixed(2) : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Expected Amount">
              {invoice.expected_amount != null ? Number(invoice.expected_amount).toFixed(2) : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Status">{invoice.status}</Descriptions.Item>
          </Descriptions>

          <Table
            className="mt-6"
            rowKey="id"
            dataSource={invoice.items}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} items`,
            }}
            columns={[
              {
                title: "Start Date",
                dataIndex: "start_date",
                render: (v: string | null) => formatUtcDate(v) ?? "-",
              },
              {
                title: "End Date",
                dataIndex: "end_date",
                render: (v: string | null) => formatUtcDate(v) ?? "-",
              },
              {
                title: "Unit",
                dataIndex: "unit",
                render: (v: string | null) => (v != null ? Number(v).toFixed(2) : "-"),
              },
              {
                title: "Input Rate",
                dataIndex: "input_rate",
                render: (v: string | null) => (v != null ? Number(v).toFixed(2) : "-"),
              },
              {
                title: "Max Rate",
                dataIndex: "max_rate",
                render: (v: string | null) => (v != null ? Number(v).toFixed(2) : "-"),
              },
              {
                title: "Amount",
                dataIndex: "amount",
                render: (v: string | null) => (v != null ? Number(v).toFixed(2) : "-"),
              },
            ]}
          />
        </>
      )}
    </div>
  );
}
