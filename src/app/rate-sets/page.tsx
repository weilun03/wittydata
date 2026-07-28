"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Table, Button, Typography, message } from "antd";
import dayjs from "dayjs";
import type { RateSetRecord } from "@/screens/rate-set/types";

export default function RateSetsPage() {
  const [rows, setRows] = useState<RateSetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    fetch(`/api/rate-sets?page=${page}&pageSize=${pageSize}`)
      .then((res) => res.json())
      .then((json) => {
        if (ignore) return;
        if (json.data) {
          setRows(json.data);
          setTotal(json.meta?.total ?? 0);
        }
      })
      .catch(() => message.error("Failed to load rate sets."))
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
          Rate Sets
        </Typography.Title>
        <Link href="/rate-sets/new">
          <Button type="primary">New Rate Set</Button>
        </Link>
      </div>
      <Table<RateSetRecord>
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
          { title: "Name", dataIndex: "name" },
          { title: "Description", dataIndex: "description" },
          {
            title: "Start Date",
            dataIndex: "start_date",
            render: (value: string) => dayjs(value).format("YYYY-MM-DD"),
          },
          {
            title: "End Date",
            dataIndex: "end_date",
            render: (value: string | null) => (value ? dayjs(value).format("YYYY-MM-DD") : "-"),
          },
          {
            title: "",
            key: "actions",
            render: (_, record) => <Link href={`/rate-sets/${record.id}`}>View</Link>,
          },
        ]}
      />
    </div>
  );
}
