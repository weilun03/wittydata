"use client";

import { useEffect } from "react";
import { Form, Input, Button, Alert, Space } from "antd";

interface ProviderFormInitialValues {
  abn?: string;
  name?: string;
  email?: string;
  phone_number?: string | null;
  address?: string;
  unit_building?: string | null;
}

interface ProviderFormProps {
  initialValues?: ProviderFormInitialValues;
  submitLabel: string;
  submitting: boolean;
  errorMessage?: string | null;
  fieldErrors?: Record<string, string[]>;
  onSubmit: (values: Record<string, unknown>) => void;
}

export function ProviderForm({
  initialValues,
  submitLabel,
  submitting,
  errorMessage,
  fieldErrors,
  onSubmit,
}: ProviderFormProps) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue(initialValues);
    }
  }, [initialValues, form]);

  const fieldError = (field: string) =>
    fieldErrors?.[field] ? { validateStatus: "error" as const, help: fieldErrors[field][0] } : {};

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onSubmit}
      initialValues={initialValues}
      className="max-w-xl"
    >
      {errorMessage && <Alert type="error" message={errorMessage} showIcon className="mb-4" />}

      <Form.Item label="ABN" name="abn" rules={[{ required: true }]} {...fieldError("abn")}>
        <Input maxLength={11} />
      </Form.Item>

      <Form.Item label="Name" name="name" rules={[{ required: true }]} {...fieldError("name")}>
        <Input />
      </Form.Item>

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

      <Form.Item label="Address" name="address" rules={[{ required: true }]} {...fieldError("address")}>
        <Input.TextArea rows={2} />
      </Form.Item>

      <Form.Item label="Unit / Building" name="unit_building" {...fieldError("unit_building")}>
        <Input />
      </Form.Item>

      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={submitting}>
            {submitLabel}
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
}
