"use client";

import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { Table, Typography, message, Space, Tooltip, Tag, Popconfirm, Spin } from "antd";
import { StopOutlined, DeleteOutlined } from "@ant-design/icons";
import type { AuthSessionRecord } from "@/modules/auth-session/types";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { NoPermission } from "@/components/NoPermission";
import { PERMISSIONS } from "@/lib/permissions";

function statusTag(record: AuthSessionRecord) {
  if (record.revoked_at) return <Tag color="default">Revoked</Tag>;
  if (dayjs(record.expires_at).isBefore(dayjs())) return <Tag color="orange">Expired</Tag>;
  return <Tag color="green">Active</Tag>;
}

export default function SessionsPage() {
  const { loading: permissionsLoading, hasPermission } = useCurrentUser();
  const canRead = hasPermission(PERMISSIONS.AUTH_SESSIONS_READ);
  const canRevoke = hasPermission(PERMISSIONS.AUTH_SESSIONS_REVOKE);
  const canDelete = hasPermission(PERMISSIONS.AUTH_SESSIONS_DELETE);

  const [rows, setRows] = useState<AuthSessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (permissionsLoading || !canRead) return;

    let ignore = false;
    setLoading(true);
    fetch(`/api/auth/sessions?page=${page}&pageSize=${pageSize}`)
      .then((res) => res.json())
      .then((json) => {
        if (ignore) return;
        if (json.data) {
          setRows(json.data);
          setTotal(json.meta?.total ?? 0);
        }
      })
      .catch(() => message.error("Failed to load sessions."))
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [page, pageSize, permissionsLoading, canRead]);

  const handleRevoke = async (id: string) => {
    try {
      const res = await fetch(`/api/auth/sessions/${id}/revoke`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        message.error(json.error?.message ?? "Failed to revoke session.");
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, revoked_at: json.data.revoked_at } : r)));
      message.success("Session revoked.");
    } catch {
      message.error("Failed to revoke session.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/auth/sessions/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        message.error(json.error?.message ?? "Failed to delete session.");
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== id));
      setTotal((t) => t - 1);
      message.success("Session deleted.");
    } catch {
      message.error("Failed to delete session.");
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
        <NoPermission message="You do not have permission to view auth sessions." />
      </div>
    );
  }

  return (
    <div className="p-8">
      <Typography.Title level={3} className="!mb-4">
        Auth Sessions
      </Typography.Title>
      <Table<AuthSessionRecord>
        rowKey="id"
        loading={loading}
        dataSource={rows}
        scroll={{ x: "max-content" }}
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
            title: "User",
            key: "user",
            render: (_, record) => (
              <div>
                <div>{record.full_name}</div>
                <div className="text-xs text-gray-500">{record.email}</div>
              </div>
            ),
          },
          { title: "Role", dataIndex: "role_label" },
          {
            title: "IP",
            dataIndex: "ip",
            render: (v: string | null) => v ?? "-",
          },
          {
            title: "User Agent",
            dataIndex: "user_agent",
            render: (v: string | null) =>
              v ? (
                <Tooltip title={v}>
                  <span>{v.length > 40 ? `${v.slice(0, 40)}…` : v}</span>
                </Tooltip>
              ) : (
                "-"
              ),
          },
          {
            title: "Created",
            dataIndex: "created_at",
            render: (v: string) => dayjs(v).format("YYYY-MM-DD HH:mm"),
          },
          {
            title: "Expires",
            dataIndex: "expires_at",
            render: (v: string) => dayjs(v).format("YYYY-MM-DD HH:mm"),
          },
          {
            title: "Status",
            key: "status",
            render: (_, record) => statusTag(record),
          },
          {
            title: "Actions",
            key: "actions",
            fixed: "right",
            render: (_, record) => (
              <Space size="middle">
                {canRevoke && !record.revoked_at && (
                  <Popconfirm
                    title="Revoke this session?"
                    okText="Revoke"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => handleRevoke(record.id)}
                  >
                    <Tooltip title="Revoke">
                      <StopOutlined style={{ color: "#fa8c16" }} />
                    </Tooltip>
                  </Popconfirm>
                )}
                {canDelete && (
                  <Popconfirm
                    title="Permanently delete this session record?"
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
