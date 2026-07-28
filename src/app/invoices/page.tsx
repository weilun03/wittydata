"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Table, Button, Typography, Tag, message } from "antd";
import type { InvoiceListRow } from "@/screens/invoice/types";

export default function InvoicesPage() {
  const [rows, setRows] = useState<InvoiceListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    fetch(`/api/invoices?page=${page}&pageSize=${pageSize}`)
      .then((res) => res.json())
      .then((json) => {
        if (ignore) return;
        if (json.data) {
          setRows(json.data);
          setTotal(json.meta?.total ?? 0);
        }
      })
      .catch(() => message.error("Failed to load invoices."))
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [page, pageSize]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-4">
        <Typography.Title level={3} className="!mb-0">
          Invoices
        </Typography.Title>
        <Link href="/invoices/new">
          <Button type="primary">New Invoice</Button>
        </Link>
      </div>
      <Table<InvoiceListRow>
        rowKey="id"
        loading={loading}
        dataSource={rows}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
        columns={[
          { title: "Invoice Number", dataIndex: "invoice_number" },
          { title: "Invoice Date", dataIndex: "invoice_date" },
          { title: "Participant", dataIndex: "client_name", render: (v) => v ?? "-" },
          { title: "Provider", dataIndex: "provider_name", render: (v) => v ?? "-" },
          { title: "Amount", dataIndex: "amount", render: (v: string | null) => (v ? Number(v).toFixed(2) : "-") },
          {
            title: "Expected Amount",
            dataIndex: "expected_amount",
            render: (v: string | null) => (v ? Number(v).toFixed(2) : "-"),
          },
          {
            title: "Status",
            dataIndex: "status",
            render: (status: string) => (
              <Tag color={status === "completed" ? "green" : "orange"}>{status}</Tag>
            ),
          },
          {
            title: "",
            key: "actions",
            render: (_, record) => <Link href={`/invoices/${record.id}`}>View</Link>,
          },
        ]}
      />
    </div>
  );
}
