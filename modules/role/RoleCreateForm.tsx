"use client";

import { Form, Input, Checkbox, Button, Alert, Space } from "antd";
import type { Permission } from "./types";
import { groupPermissionsByEntity } from "./permission-groups";
import { PermissionCardGrid } from "./PermissionCardGrid";

interface RoleCreateFormProps {
  permissions: Permission[];
  submitting: boolean;
  errorMessage?: string | null;
  fieldErrors?: Record<string, string[]>;
  onSubmit: (values: Record<string, unknown>) => void;
}

export function RoleCreateForm({
  permissions,
  submitting,
  errorMessage,
  fieldErrors,
  onSubmit,
}: RoleCreateFormProps) {
  const [form] = Form.useForm();

  const fieldError = (field: string) =>
    fieldErrors?.[field] ? { validateStatus: "error" as const, help: fieldErrors[field][0] } : {};

  const groups = groupPermissionsByEntity(permissions);

  return (
    <Form form={form} layout="vertical" onFinish={onSubmit}>
      {errorMessage && <Alert type="error" title={errorMessage} showIcon className="mb-4" />}

      <Form.Item
        label="Code"
        name="code"
        rules={[{ required: true }]}
        extra="Uppercase letters, numbers, and underscores only, e.g. BILLING_OFFICER. Cannot be changed later."
        {...fieldError("code")}
      >
        <Input />
      </Form.Item>

      <Form.Item label="Label" name="label" rules={[{ required: true }]} {...fieldError("label")}>
        <Input />
      </Form.Item>

      <Form.Item label="Permissions" name="permission_ids" {...fieldError("permission_ids")}>
        <Checkbox.Group className="w-full" style={{ width: "100%" }}>
          <PermissionCardGrid groups={groups} />
        </Checkbox.Group>
      </Form.Item>

      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={submitting}>
            Create Role
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
}
