"use client";

import { useEffect } from "react";
import { Form, Input, DatePicker, Button, Alert, Space } from "antd";
import type { Dayjs } from "dayjs";

interface RateSetFormInitialValues {
  name?: string;
  description?: string | null;
  start_date?: Dayjs;
  end_date?: Dayjs;
}

interface RateSetFormProps {
  initialValues?: RateSetFormInitialValues;
  submitLabel: string;
  submitting: boolean;
  errorMessage?: string | null;
  fieldErrors?: Record<string, string[]>;
  onSubmit: (values: Record<string, unknown>) => void;
}

export function RateSetForm({
  initialValues,
  submitLabel,
  submitting,
  errorMessage,
  fieldErrors,
  onSubmit,
}: RateSetFormProps) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue(initialValues);
    }
  }, [initialValues, form]);

  const fieldError = (field: string) =>
    fieldErrors?.[field] ? { validateStatus: "error" as const, help: fieldErrors[field][0] } : {};

  const handleFinish = (values: Record<string, unknown>) => {
    const startDate = values.start_date as Dayjs | undefined;
    const endDate = values.end_date as Dayjs | undefined;
    onSubmit({
      ...values,
      start_date: startDate ? startDate.format("YYYY-MM-DD") : undefined,
      end_date: endDate ? endDate.format("YYYY-MM-DD") : undefined,
    });
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      initialValues={initialValues}
      className="max-w-xl"
    >
      {errorMessage && <Alert type="error" title={errorMessage} showIcon className="mb-4" />}

      <Form.Item label="Name" name="name" rules={[{ required: true }]} {...fieldError("name")}>
        <Input placeholder="e.g. 2025-26 v1.1" />
      </Form.Item>

      <Form.Item label="Description" name="description" {...fieldError("description")}>
        <Input.TextArea rows={2} />
      </Form.Item>

      <Form.Item
        label="Start Date"
        name="start_date"
        rules={[{ required: true }]}
        {...fieldError("start_date")}
      >
        <DatePicker className="w-full" format="YYYY-MM-DD" />
      </Form.Item>

      <Form.Item
        label="End Date"
        name="end_date"
        tooltip="Leave blank for an open-ended rate set."
        {...fieldError("end_date")}
      >
        <DatePicker className="w-full" format="YYYY-MM-DD" />
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
