"use client";

import { useEffect } from "react";
import { Form, Input, Checkbox, Button, Alert, Space } from "antd";
import type { Permission } from "./types";
import { groupPermissionsByEntity } from "./permission-groups";
import { PermissionCardGrid } from "./PermissionCardGrid";

interface RoleEditFormInitialValues {
  label: string;
  permission_ids: number[];
}

interface RoleEditFormProps {
  permissions: Permission[];
  initialValues: RoleEditFormInitialValues;
  submitting: boolean;
  errorMessage?: string | null;
  fieldErrors?: Record<string, string[]>;
  onSubmit: (values: Record<string, unknown>) => void;
}

export function RoleEditForm({
  permissions,
  initialValues,
  submitting,
  errorMessage,
  fieldErrors,
  onSubmit,
}: RoleEditFormProps) {
  const [form] = Form.useForm();

  useEffect(() => {
    form.setFieldsValue(initialValues);
  }, [initialValues, form]);

  const fieldError = (field: string) =>
    fieldErrors?.[field] ? { validateStatus: "error" as const, help: fieldErrors[field][0] } : {};

  const groups = groupPermissionsByEntity(permissions);

  return (
    <Form form={form} layout="vertical" onFinish={onSubmit} initialValues={initialValues}>
      {errorMessage && <Alert type="error" title={errorMessage} showIcon className="mb-4" />}

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
            Save Changes
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
}
