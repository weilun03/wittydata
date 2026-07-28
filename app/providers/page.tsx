"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Table, Button, Typography, message } from "antd";
import type { ProviderRecord } from "@/modules/provider/types";

export default function ProvidersPage() {
  const [rows, setRows] = useState<ProviderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    fetch(`/api/providers?page=${page}&pageSize=${pageSize}`)
      .then((res) => res.json())
      .then((json) => {
        if (ignore) return;
        if (json.data) {
          setRows(json.data);
          setTotal(json.meta?.total ?? 0);
        }
      })
      .catch(() => message.error("Failed to load providers."))
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
          Providers
        </Typography.Title>
        <Link href="/providers/new">
          <Button type="primary">New Provider</Button>
        </Link>
      </div>
      <Table<ProviderRecord>
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
          { title: "ABN", dataIndex: "abn" },
          { title: "Name", dataIndex: "name" },
          { title: "Email", dataIndex: "email" },
          { title: "Phone Number", dataIndex: "phone_number" },
          {
            title: "",
            key: "actions",
            render: (_, record) => <Link href={`/providers/${record.id}`}>View</Link>,
          },
        ]}
      />
    </div>
  );
}
