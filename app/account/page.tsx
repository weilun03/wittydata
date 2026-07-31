"use client";

import { useState } from "react";
import { Button, Card, Form, Input, Typography, Alert, message } from "antd";

export default function AccountPage() {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (values: { current_password: string; new_password: string }) => {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMessage(json.error?.message ?? "Failed to change password.");
        return;
      }
      message.success("Password changed.");
      form.resetFields();
    } catch {
      setErrorMessage("Failed to change password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8">
      <Typography.Title level={3} className="mb-4">
        My Account
      </Typography.Title>
      <Card style={{ maxWidth: 480 }}>
        <Typography.Title level={5} className="!mt-0">
          Change Password
        </Typography.Title>
        {errorMessage && <Alert type="error" title={errorMessage} showIcon className="mb-4" />}
        <Form form={form} layout="vertical" onFinish={handleSubmit} disabled={submitting}>
          <Form.Item
            name="current_password"
            label="Current Password"
            rules={[{ required: true, message: "Current password is required." }]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Form.Item
            name="new_password"
            label="New Password"
            rules={[
              { required: true, message: "New password is required." },
              { min: 8, message: "Password must be at least 8 characters." },
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting}>
            Change Password
          </Button>
        </Form>
      </Card>
    </div>
  );
}
