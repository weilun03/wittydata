"use client";

import { useEffect } from "react";
import { Form, Input, Select, Button, Alert, Space, Card } from "antd";
import type { Role } from "./types";

interface UserFormInitialValues {
  email?: string;
  full_name?: string;
  role_id?: number;
}

interface UserFormProps {
  roles: Role[];
  initialValues?: UserFormInitialValues;
  showPassword?: boolean;
  submitLabel: string;
  submitting: boolean;
  errorMessage?: string | null;
  fieldErrors?: Record<string, string[]>;
  onSubmit: (values: Record<string, unknown>) => void;
}

export function UserForm({
  roles,
  initialValues,
  showPassword = false,
  submitLabel,
  submitting,
  errorMessage,
  fieldErrors,
  onSubmit,
}: UserFormProps) {
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
        label="Full Name"
        name="full_name"
        rules={[{ required: true }]}
        {...fieldError("full_name")}
      >
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

      <Form.Item label="Role" name="role_id" rules={[{ required: true }]} {...fieldError("role_id")}>
        <Select
          placeholder="Select a role"
          options={roles.map((role) => ({ value: role.id, label: role.label }))}
        />
      </Form.Item>

      {showPassword && (
        <Form.Item
          label="Password"
          name="password"
          rules={[
            { required: true, message: "Password is required." },
            { min: 8, message: "Password must be at least 8 characters." },
          ]}
          {...fieldError("password")}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
      )}

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
