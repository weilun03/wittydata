"use client";

import { useEffect } from "react";
import { Form, Input, Button, Alert, Space, Card } from "antd";

interface GenderFormInitialValues {
  code?: string;
  label?: string;
}

interface GenderFormProps {
  initialValues?: GenderFormInitialValues;
  submitLabel: string;
  submitting: boolean;
  errorMessage?: string | null;
  fieldErrors?: Record<string, string[]>;
  onSubmit: (values: Record<string, unknown>) => void;
}

export function GenderForm({
  initialValues,
  submitLabel,
  submitting,
  errorMessage,
  fieldErrors,
  onSubmit,
}: GenderFormProps) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue(initialValues);
    }
  }, [initialValues, form]);

  const fieldError = (field: string) =>
    fieldErrors?.[field] ? { validateStatus: "error" as const, help: fieldErrors[field][0] } : {};

  return (
    <Card className="max-w-xl">
      <Form form={form} layout="vertical" onFinish={onSubmit} initialValues={initialValues}>
      {errorMessage && <Alert type="error" title={errorMessage} showIcon className="mb-4" />}

      <Form.Item
        label="Code"
        name="code"
        rules={[{ required: true }]}
        extra="Uppercase letters, numbers, and underscores only, e.g. FEMALE."
        {...fieldError("code")}
      >
        <Input style={{ textTransform: "uppercase" }} />
      </Form.Item>

      <Form.Item label="Label" name="label" rules={[{ required: true }]} {...fieldError("label")}>
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
    </Card>
  );
}
