"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Table, Button, Typography, message, Space, Tooltip, Popconfirm, Spin } from "antd";
import { EyeOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import type { RateSetRecord } from "@/modules/rate-set/types";
import { formatUtcDate } from "@/lib/dates";
import { IdCell } from "@/components/IdCell";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { NoPermission } from "@/components/NoPermission";
import { PERMISSIONS } from "@/lib/permissions";

export default function RateSetsPage() {
  const { loading: permissionsLoading, hasPermission } = useCurrentUser();
  const canRead = hasPermission(PERMISSIONS.RATE_SETS_READ);
  const canCreate = hasPermission(PERMISSIONS.RATE_SETS_CREATE);
  const canUpdate = hasPermission(PERMISSIONS.RATE_SETS_UPDATE);
  const canDelete = hasPermission(PERMISSIONS.RATE_SETS_DELETE);

  const [rows, setRows] = useState<RateSetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (permissionsLoading || !canRead) return;

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
  }, [page, pageSize, permissionsLoading, canRead]);

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/rate-sets/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        message.error(json.error?.message ?? "Failed to delete rate set.");
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== id));
      setTotal((t) => t - 1);
      message.success("Rate set deleted.");
    } catch {
      message.error("Failed to delete rate set.");
    }
  };

  if (permissionsLoading) {
    return (
      <div className="p-8">
        <Spin />
      </div>
    );
  }

  if (!canRead) {
    return (
      <div className="p-8">
        <NoPermission message="You do not have permission to view rate sets." />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-4">
        <Typography.Title level={3} className="!mb-0">
          Rate Sets
        </Typography.Title>
        {canCreate && (
          <Link href="/rate-sets/new">
            <Button type="primary">New Rate Set</Button>
          </Link>
        )}
      </div>
      <Table<RateSetRecord>
        rowKey="id"
        loading={loading}
        dataSource={rows}
        scroll={{ x: 900 }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} items`,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
        columns={[
          {
            title: "ID",
            key: "id",
            width: 190,
            render: (_, record) => (
              <IdCell id={record.id} createdAt={record.created_at} updatedAt={record.updated_at} />
            ),
          },
          { title: "Name", dataIndex: "name" },
          { title: "Description", dataIndex: "description" },
          {
            title: "Start Date",
            dataIndex: "start_date",
            render: (value: string) => formatUtcDate(value) ?? "-",
          },
          {
            title: "End Date",
            dataIndex: "end_date",
            render: (value: string | null) => formatUtcDate(value) ?? "-",
          },
          {
            title: "Actions",
            key: "actions",
            width: 100,
            fixed: "right",
            render: (_, record) => (
              <Space size="middle">
                <Tooltip title="View">
                  <Link href={`/rate-sets/${record.id}`}>
                    <EyeOutlined style={{ color: "#1677ff" }} />
                  </Link>
                </Tooltip>
                {canUpdate && (
                  <Tooltip title="Edit">
                    <Link href={`/rate-sets/${record.id}?edit=true`}>
                      <EditOutlined style={{ color: "#fa8c16" }} />
                    </Link>
                  </Tooltip>
                )}
                {canDelete && (
                  <Popconfirm
                    title="Delete this rate set?"
                    okText="Delete"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => handleDelete(record.id)}
                  >
                    <Tooltip title="Delete">
                      <DeleteOutlined style={{ color: "#ff4d4f" }} />
                    </Tooltip>
                  </Popconfirm>
                )}
              </Space>
            ),
          },
        ]}
      />
    </div>
  );
}
