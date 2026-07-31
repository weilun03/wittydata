"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Form, Input, Typography, Alert } from "antd";

export default function LoginPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (values: { email: string; password: string }) => {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMessage(json.error?.message ?? "Failed to sign in.");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setErrorMessage("Failed to sign in.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <Card style={{ width: 360 }}>
        <Typography.Title level={4} className="!mb-6">
          NDIS Invoicing
        </Typography.Title>
        {errorMessage && <Alert type="error" title={errorMessage} showIcon className="mb-4" />}
        <Form layout="vertical" onFinish={handleSubmit} disabled={submitting}>
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true, message: "Email is required." }]}
          >
            <Input autoComplete="username" autoFocus />
          </Form.Item>
          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: "Password is required." }]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={submitting}>
            Sign in
          </Button>
        </Form>
      </Card>
    </div>
  );
}
