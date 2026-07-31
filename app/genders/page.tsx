"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Table, Button, Typography, message, Space, Tooltip, Tag, Popconfirm, Spin } from "antd";
import { EyeOutlined, EditOutlined, StopOutlined, CheckCircleOutlined } from "@ant-design/icons";
import type { GenderRecord } from "@/modules/gender/types";
import { IdCell } from "@/components/IdCell";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { NoPermission } from "@/components/NoPermission";
import { PERMISSIONS } from "@/lib/permissions";

export default function GendersPage() {
  const { loading: permissionsLoading, hasPermission } = useCurrentUser();
  const canRead = hasPermission(PERMISSIONS.GENDERS_READ);
  const canCreate = hasPermission(PERMISSIONS.GENDERS_CREATE);
  const canUpdate = hasPermission(PERMISSIONS.GENDERS_UPDATE);
  const canDelete = hasPermission(PERMISSIONS.GENDERS_DELETE);

  const [rows, setRows] = useState<GenderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (permissionsLoading || !canRead) return;

    let ignore = false;
    setLoading(true);
    fetch(`/api/genders?page=${page}&pageSize=${pageSize}`)
      .then((res) => res.json())
      .then((json) => {
        if (ignore) return;
        if (json.data) {
          setRows(json.data);
          setTotal(json.meta?.total ?? 0);
        }
      })
      .catch(() => message.error("Failed to load genders."))
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [page, pageSize, permissionsLoading, canRead]);

  const handleDeactivate = async (id: number) => {
    try {
      const res = await fetch(`/api/genders/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        message.error(json.error?.message ?? "Failed to deactivate gender.");
        return;
      }
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, deactivated_at: new Date().toISOString() } : r)),
      );
      message.success("Gender deactivated.");
    } catch {
      message.error("Failed to deactivate gender.");
    }
  };

  const handleReactivate = async (id: number) => {
    try {
      const res = await fetch(`/api/genders/${id}/reactivate`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        message.error(json.error?.message ?? "Failed to reactivate gender.");
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, deactivated_at: null } : r)));
      message.success("Gender reactivated.");
    } catch {
      message.error("Failed to reactivate gender.");
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
        <NoPermission message="You do not have permission to view genders." />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-4">
        <Typography.Title level={3} className="!mb-0">
          Genders
        </Typography.Title>
        {canCreate && (
          <Link href="/genders/new">
            <Button type="primary">New Gender</Button>
          </Link>
        )}
      </div>
      <Table<GenderRecord>
        rowKey="id"
        loading={loading}
        dataSource={rows}
        scroll={{ x: 650 }}
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
          { title: "Code", dataIndex: "code" },
          { title: "Label", dataIndex: "label" },
          {
            title: "Status",
            key: "status",
            render: (_, record) =>
              record.deactivated_at ? (
                <Tag color="default">Deactivated</Tag>
              ) : (
                <Tag color="green">Active</Tag>
              ),
          },
          {
            title: "Actions",
            key: "actions",
            width: 100,
            fixed: "right",
            render: (_, record) => (
              <Space size="middle">
                <Tooltip title="View">
                  <Link href={`/genders/${record.id}`}>
                    <EyeOutlined style={{ color: "#1677ff" }} />
                  </Link>
                </Tooltip>
                {canUpdate && (
                  <Tooltip title="Edit">
                    <Link href={`/genders/${record.id}?edit=true`}>
                      <EditOutlined style={{ color: "#fa8c16" }} />
                    </Link>
                  </Tooltip>
                )}
                {record.deactivated_at
                  ? canUpdate && (
                      <Tooltip title="Reactivate">
                        <CheckCircleOutlined
                          style={{ color: "#52c41a" }}
                          onClick={() => handleReactivate(record.id)}
                        />
                      </Tooltip>
                    )
                  : canDelete && (
                      <Popconfirm
                        title="Deactivate this gender?"
                        okText="Deactivate"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => handleDeactivate(record.id)}
                      >
                        <Tooltip title="Deactivate">
                          <StopOutlined style={{ color: "#ff4d4f" }} />
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
