"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Table, Button, Typography, message, Space, Tooltip, Popconfirm, Spin } from "antd";
import { EyeOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import type { UserRecord } from "@/modules/user/types";
import { IdCell } from "@/components/IdCell";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { NoPermission } from "@/components/NoPermission";
import { PERMISSIONS } from "@/lib/permissions";

export default function UsersPage() {
  const { loading: permissionsLoading, hasPermission } = useCurrentUser();
  const canRead = hasPermission(PERMISSIONS.USERS_READ);
  const canCreate = hasPermission(PERMISSIONS.USERS_CREATE);
  const canUpdate = hasPermission(PERMISSIONS.USERS_UPDATE);
  const canDelete = hasPermission(PERMISSIONS.USERS_DELETE);

  const [rows, setRows] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (permissionsLoading || !canRead) return;

    let ignore = false;
    setLoading(true);
    fetch(`/api/users?page=${page}&pageSize=${pageSize}`)
      .then((res) => res.json())
      .then((json) => {
        if (ignore) return;
        if (json.data) {
          setRows(json.data);
          setTotal(json.meta?.total ?? 0);
        }
      })
      .catch(() => message.error("Failed to load users."))
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [page, pageSize, permissionsLoading, canRead]);

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        message.error(json.error?.message ?? "Failed to delete user.");
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== id));
      setTotal((t) => t - 1);
      message.success("User deleted.");
    } catch {
      message.error("Failed to delete user.");
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
        <NoPermission message="You do not have permission to view users." />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-4">
        <Typography.Title level={3} className="!mb-0">
          Users
        </Typography.Title>
        {canCreate && (
          <Link href="/users/new">
            <Button type="primary">New User</Button>
          </Link>
        )}
      </div>
      <Table<UserRecord>
        rowKey="id"
        loading={loading}
        dataSource={rows}
        scroll={{ x: 750 }}
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
          { title: "Full Name", dataIndex: "full_name" },
          { title: "Email", dataIndex: "email" },
          { title: "Role", dataIndex: "role_label" },
          {
            title: "Actions",
            key: "actions",
            width: 100,
            fixed: "right",
            render: (_, record) => (
              <Space size="middle">
                <Tooltip title="View">
                  <Link href={`/users/${record.id}`}>
                    <EyeOutlined style={{ color: "#1677ff" }} />
                  </Link>
                </Tooltip>
                {canUpdate && (
                  <Tooltip title="Edit">
                    <Link href={`/users/${record.id}?edit=true`}>
                      <EditOutlined style={{ color: "#fa8c16" }} />
                    </Link>
                  </Tooltip>
                )}
                {canDelete && !record.is_default && (
                  <Popconfirm
                    title="Delete this user?"
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
