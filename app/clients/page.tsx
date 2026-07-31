"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Table, Button, Typography, message, Space, Tooltip, Popconfirm, Spin } from "antd";
import { EyeOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import type { ClientRecord } from "@/modules/client/types";
import { IdCell } from "@/components/IdCell";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { NoPermission } from "@/components/NoPermission";
import { PERMISSIONS } from "@/lib/permissions";

export default function ClientsPage() {
  const { loading: permissionsLoading, hasPermission } = useCurrentUser();
  const canRead = hasPermission(PERMISSIONS.CLIENTS_READ);
  const canCreate = hasPermission(PERMISSIONS.CLIENTS_CREATE);
  const canUpdate = hasPermission(PERMISSIONS.CLIENTS_UPDATE);
  const canDelete = hasPermission(PERMISSIONS.CLIENTS_DELETE);

  const [rows, setRows] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (permissionsLoading || !canRead) return;

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
  }, [page, pageSize, permissionsLoading, canRead]);

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        message.error(json.error?.message ?? "Failed to delete participant.");
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== id));
      setTotal((t) => t - 1);
      message.success("Participant deleted.");
    } catch {
      message.error("Failed to delete participant.");
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
        <NoPermission message="You do not have permission to view participants." />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-4">
        <Typography.Title level={3} className="!mb-0">
          Participants
        </Typography.Title>
        {canCreate && (
          <Link href="/clients/new">
            <Button type="primary">New Participant</Button>
          </Link>
        )}
      </div>
      <Table<ClientRecord>
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
          { title: "First Name", dataIndex: "first_name" },
          { title: "Last Name", dataIndex: "last_name" },
          { title: "NDIS Number", dataIndex: "ndis_number" },
          { title: "Email", dataIndex: "email" },
          { title: "Pricing Region", dataIndex: "pricing_region" },
          {
            title: "Actions",
            key: "actions",
            width: 100,
            fixed: "right",
            render: (_, record) => (
              <Space size="middle">
                <Tooltip title="View">
                  <Link href={`/clients/${record.id}`}>
                    <EyeOutlined style={{ color: "#1677ff" }} />
                  </Link>
                </Tooltip>
                {canUpdate && (
                  <Tooltip title="Edit">
                    <Link href={`/clients/${record.id}?edit=true`}>
                      <EditOutlined style={{ color: "#fa8c16" }} />
                    </Link>
                  </Tooltip>
                )}
                {canDelete && (
                  <Popconfirm
                    title="Delete this participant?"
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
