"use client";

import { useEffect } from "react";
import { Form, Input, Select, DatePicker, Button, Alert, Space, Card } from "antd";
import type { Dayjs } from "dayjs";
import type { Gender, PricingRegion } from "@/modules/client/types";

interface ClientFormInitialValues {
  first_name?: string;
  last_name?: string;
  gender_id?: number;
  dob?: Dayjs;
  ndis_number?: string;
  email?: string;
  phone_number?: string | null;
  address?: string;
  unit_building?: string | null;
  pricing_region?: string;
}

interface ClientFormProps {
  genders: Gender[];
  pricingRegions: PricingRegion[];
  initialValues?: ClientFormInitialValues;
  submitLabel: string;
  submitting: boolean;
  errorMessage?: string | null;
  fieldErrors?: Record<string, string[]>;
  onSubmit: (values: Record<string, unknown>) => void;
}

export function ClientForm({
  genders,
  pricingRegions,
  initialValues,
  submitLabel,
  submitting,
  errorMessage,
  fieldErrors,
  onSubmit,
}: ClientFormProps) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue(initialValues);
    }
  }, [initialValues, form]);

  const fieldError = (field: string) =>
    fieldErrors?.[field] ? { validateStatus: "error" as const, help: fieldErrors[field][0] } : {};

  const handleFinish = (values: Record<string, unknown>) => {
    const dob = values.dob as Dayjs | undefined;
    onSubmit({
      ...values,
      dob: dob ? dob.format("YYYY-MM-DD") : undefined,
    });
  };

  return (
    <Card>
      <Form form={form} layout="vertical" onFinish={handleFinish} initialValues={initialValues}>
      {errorMessage && <Alert type="error" title={errorMessage} showIcon className="mb-4" />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Form.Item label="First Name" name="first_name" rules={[{ required: true }]} {...fieldError("first_name")}>
          <Input />
        </Form.Item>

        <Form.Item label="Last Name" name="last_name" rules={[{ required: true }]} {...fieldError("last_name")}>
          <Input />
        </Form.Item>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Form.Item label="Gender" name="gender_id" rules={[{ required: true }]} {...fieldError("gender_id")}>
          <Select options={genders.map((g) => ({ value: g.id, label: g.label }))} />
        </Form.Item>

        <Form.Item label="Date of Birth" name="dob" rules={[{ required: true }]} {...fieldError("dob")}>
          <DatePicker className="w-full" format="YYYY-MM-DD" />
        </Form.Item>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Form.Item
          label="Email"
          name="email"
          rules={[{ required: true, type: "email" }]}
          {...fieldError("email")}
        >
          <Input />
        </Form.Item>

        <Form.Item label="Phone Number" name="phone_number" {...fieldError("phone_number")}>
          <Input />
        </Form.Item>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Form.Item
          label="NDIS Number"
          name="ndis_number"
          rules={[{ required: true }]}
          {...fieldError("ndis_number")}
        >
          <Input maxLength={16} />
        </Form.Item>

        <Form.Item
          label="Pricing Region"
          name="pricing_region"
          rules={[{ required: true }]}
          {...fieldError("pricing_region")}
        >
          <Select options={pricingRegions.map((r) => ({ value: r.code, label: r.full_label }))} />
        </Form.Item>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Form.Item label="Address" name="address" rules={[{ required: true }]} {...fieldError("address")}>
          <Input.TextArea rows={2} />
        </Form.Item>

        <Form.Item label="Unit / Building" name="unit_building" {...fieldError("unit_building")}>
          <Input />
        </Form.Item>
      </div>

      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={submitting}>
            {submitLabel}
          </Button>
        </Space>
      </Form.Item>
      </Form>
    </Card>
  );
}
