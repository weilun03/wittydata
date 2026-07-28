"use client";

import { useEffect, useState } from "react";
import { Alert, Button, DatePicker, Form, Input, InputNumber, Select, Space, Typography } from "antd";
import type { Dayjs } from "dayjs";
import { InvoiceItemsEditor } from "@/modules/invoice/InvoiceItemsEditor";
import type { InvoiceItemValue } from "@/modules/invoice/InvoiceItemRow";
import type { ClientRecord } from "@/modules/client/types";
import type { ProviderRecord } from "@/modules/provider/types";

interface InvoiceFormInitialValues {
  client_id?: number;
  provider_id?: number;
  invoice_number?: string;
  invoice_date?: Dayjs;
  expected_amount?: number;
  items?: InvoiceItemValue[];
}

interface InvoiceFormProps {
  initialValues?: InvoiceFormInitialValues;
  submitting: boolean;
  errorMessage?: string | null;
  fieldErrors?: Record<string, string[]>;
  onSubmit: (values: Record<string, unknown>, status: "drafted" | "completed") => void;
}

export function InvoiceForm({
  initialValues,
  submitting,
  errorMessage,
  fieldErrors,
  onSubmit,
}: InvoiceFormProps) {
  const [form] = Form.useForm();
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [providers, setProviders] = useState<ProviderRecord[]>([]);
  const [clientId, setClientId] = useState<number | undefined>(initialValues?.client_id);
  const [items, setItems] = useState<InvoiceItemValue[]>(initialValues?.items ?? []);

  useEffect(() => {
    Promise.all([
      fetch("/api/clients?pageSize=200").then((r) => r.json()),
      fetch("/api/providers?pageSize=200").then((r) => r.json()),
    ]).then(([c, p]) => {
      setClients(c.data ?? []);
      setProviders(p.data ?? []);
    });
  }, []);

  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue(initialValues);
      setClientId(initialValues.client_id);
      setItems(initialValues.items ?? []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValues]);

  const fieldError = (field: string) =>
    fieldErrors?.[field] ? { validateStatus: "error" as const, help: fieldErrors[field][0] } : {};

  const itemsTotal = items.reduce(
    (sum, i) => sum + (i.unit != null && i.input_rate != null ? i.unit * i.input_rate : 0),
    0,
  );

  const buildPayload = (status: "drafted" | "completed") => {
    const values = form.getFieldsValue();
    const invoiceDate = values.invoice_date as Dayjs | undefined;
    return {
      client_id: values.client_id,
      provider_id: values.provider_id,
      invoice_number: values.invoice_number,
      invoice_date: invoiceDate ? invoiceDate.format("YYYY-MM-DD") : undefined,
      expected_amount: values.expected_amount,
      status,
      items: items.map((i) => ({
        category_id: i.category_id,
        support_item_id: i.support_item_id,
        start_date: i.start_date,
        end_date: i.end_date,
        unit: i.unit,
        input_rate: i.input_rate,
      })),
    };
  };

  const handleSaveDraft = async () => {
    await form.validateFields(["invoice_number", "invoice_date", "expected_amount"]);
    onSubmit(buildPayload("drafted"), "drafted");
  };

  const handleComplete = async () => {
    await form.validateFields(["invoice_number", "invoice_date", "expected_amount"]);
    onSubmit(buildPayload("completed"), "completed");
  };

  return (
    <Form form={form} layout="vertical" initialValues={initialValues} className="max-w-3xl">
      {errorMessage && <Alert type="error" message={errorMessage} showIcon className="mb-4" />}
      {fieldErrors?.items && (
        <Alert
          type="error"
          showIcon
          className="mb-4"
          message="Invoice item errors"
          description={
            <ul className="list-disc pl-4">
              {fieldErrors.items.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          }
        />
      )}

      <div className="grid grid-cols-2 gap-4">
        <Form.Item label="Participant" name="client_id" {...fieldError("client_id")}>
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            options={clients.map((c) => ({
              value: c.id,
              label: `${c.first_name} ${c.last_name} (${c.ndis_number})`,
            }))}
            onChange={(v) => setClientId(v)}
          />
        </Form.Item>
        <Form.Item label="Provider" name="provider_id" {...fieldError("provider_id")}>
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            options={providers.map((p) => ({ value: p.id, label: `${p.name} (ABN ${p.abn})` }))}
          />
        </Form.Item>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Form.Item
          label="Invoice Number"
          name="invoice_number"
          rules={[{ required: true }]}
          {...fieldError("invoice_number")}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label="Invoice Date"
          name="invoice_date"
          rules={[{ required: true }]}
          {...fieldError("invoice_date")}
        >
          <DatePicker className="w-full" format="YYYY-MM-DD" />
        </Form.Item>
      </div>

      <Form.Item
        label="Expected Amount"
        name="expected_amount"
        rules={[{ required: true }]}
        {...fieldError("expected_amount")}
      >
        <InputNumber className="w-full" min={0} />
      </Form.Item>

      <Typography.Title level={5}>Invoice Items</Typography.Title>
      <InvoiceItemsEditor value={items} onChange={setItems} clientId={clientId} />

      <div className="mt-2 mb-4 text-right font-medium">
        Items total (preview): {itemsTotal.toFixed(2)}
      </div>

      <Form.Item>
        <Space>
          <Button onClick={handleSaveDraft} loading={submitting}>
            Save as Draft
          </Button>
          <Button type="primary" onClick={handleComplete} loading={submitting}>
            Save
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
}
