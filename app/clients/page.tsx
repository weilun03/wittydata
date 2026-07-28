"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Table, Button, Typography, message } from "antd";
import type { ClientRecord } from "@/modules/client/types";

export default function ClientsPage() {
  const [rows, setRows] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    fetch(`/api/clients?page=${page}&pageSize=${pageSize}`)
      .then((res) => res.json())
      .then((json) => {
        if (ignore) return;
        if (json.data) {
          setRows(json.data);
          setTotal(json.meta?.total ?? 0);
        }
      })
      .catch(() => message.error("Failed to load participants."))
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
          Participants
        </Typography.Title>
        <Link href="/clients/new">
          <Button type="primary">New Participant</Button>
        </Link>
      </div>
      <Table<ClientRecord>
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
          { title: "First Name", dataIndex: "first_name" },
          { title: "Last Name", dataIndex: "last_name" },
          { title: "NDIS Number", dataIndex: "ndis_number" },
          { title: "Email", dataIndex: "email" },
          { title: "Pricing Region", dataIndex: "pricing_region" },
          {
            title: "",
            key: "actions",
            render: (_, record) => <Link href={`/clients/${record.id}`}>View</Link>,
          },
        ]}
      />
    </div>
  );
}
