"use client";

import { useEffect, useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import { Table, Typography, message, Tag, Select, InputNumber, DatePicker, Space, Button, Spin } from "antd";
import type { AuditLogRecord } from "@/modules/audit-log/types";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { NoPermission } from "@/components/NoPermission";
import { PERMISSIONS } from "@/lib/permissions";

const ENTITY_OPTIONS = [
  "client",
  "provider",
  "rate_set",
  "rate_set_import",
  "invoice",
  "user",
  "user_password",
  "auth_session",
  "gender",
  "rbac_role",
].map((value) => ({ value, label: value }));

const ACTION_OPTIONS = [
  { value: "create", label: "Create" },
  { value: "update", label: "Update" },
  { value: "delete", label: "Delete" },
];

const ACTION_COLORS: Record<string, string> = {
  create: "green",
  update: "blue",
  delete: "red",
};

function DiffView({ record }: { record: AuditLogRecord }) {
  return (
    <div className="grid grid-cols-2 gap-4 max-w-4xl">
      <div>
        <div className="font-medium mb-1">Payload</div>
        <pre className="bg-gray-50 border rounded p-2 text-xs overflow-auto max-h-64">
          {record.payload ? JSON.stringify(record.payload, null, 2) : "-"}
        </pre>
      </div>
      <div>
        <div className="font-medium mb-1">Changes</div>
        <pre className="bg-gray-50 border rounded p-2 text-xs overflow-auto max-h-64">
          {record.changes_diff ? JSON.stringify(record.changes_diff, null, 2) : "-"}
        </pre>
      </div>
    </div>
  );
}

export default function AuditLogsPage() {
  const { loading: permissionsLoading, hasPermission } = useCurrentUser();
  const canRead = hasPermission(PERMISSIONS.AUDIT_LOGS_READ);

  const [rows, setRows] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const [entity, setEntity] = useState<string | undefined>();
  const [action, setAction] = useState<string | undefined>();
  const [userId, setUserId] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  useEffect(() => {
    if (permissionsLoading || !canRead) return;

    let ignore = false;
    setLoading(true);

    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (entity) params.set("entity", entity);
    if (action) params.set("action", action);
    if (userId != null) params.set("userId", String(userId));
    if (dateRange?.[0]) params.set("from", dateRange[0].startOf("day").toISOString());
    if (dateRange?.[1]) params.set("to", dateRange[1].endOf("day").toISOString());

    fetch(`/api/audit-logs?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (ignore) return;
        if (json.data) {
          setRows(json.data);
          setTotal(json.meta?.total ?? 0);
        }
      })
      .catch(() => message.error("Failed to load audit logs."))
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [page, pageSize, entity, action, userId, dateRange, permissionsLoading, canRead]);

  const clearFilters = () => {
    setEntity(undefined);
    setAction(undefined);
    setUserId(null);
    setDateRange(null);
    setPage(1);
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
        <NoPermission message="You do not have permission to view audit logs." />
      </div>
    );
  }

  return (
    <div className="p-8">
      <Typography.Title level={3} className="!mb-4">
        Audit Logs
      </Typography.Title>

      <Space wrap className="mb-4">
        <Select
          placeholder="Entity"
          allowClear
          style={{ width: 160 }}
          options={ENTITY_OPTIONS}
          value={entity}
          onChange={(v) => {
            setEntity(v);
            setPage(1);
          }}
        />
        <Select
          placeholder="Action"
          allowClear
          style={{ width: 140 }}
          options={ACTION_OPTIONS}
          value={action}
          onChange={(v) => {
            setAction(v);
            setPage(1);
          }}
        />
        <InputNumber
          placeholder="Actor User ID"
          style={{ width: 140 }}
          value={userId}
          onChange={(v) => {
            setUserId(v);
            setPage(1);
          }}
        />
        <DatePicker.RangePicker
          value={dateRange}
          onChange={(v) => {
            setDateRange(v as [Dayjs | null, Dayjs | null] | null);
            setPage(1);
          }}
        />
        <Button onClick={clearFilters}>Clear Filters</Button>
      </Space>

      <Table<AuditLogRecord>
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
        expandable={{
          expandedRowRender: (record) => <DiffView record={record} />,
        }}
        columns={[
          {
            title: "Timestamp",
            dataIndex: "created_at",
            render: (v: string) => dayjs(v).format("YYYY-MM-DD HH:mm:ss"),
          },
          {
            title: "Actor",
            key: "actor",
            render: (_, record) => (
              <div>
                <div>{record.actor_full_name ?? "-"}</div>
                <div className="text-xs text-gray-500">{record.actor_role_label ?? ""}</div>
              </div>
            ),
          },
          {
            title: "Action",
            dataIndex: "action",
            render: (v: string) => <Tag color={ACTION_COLORS[v]}>{v}</Tag>,
          },
          { title: "Entity", dataIndex: "entity" },
          { title: "Record ID", dataIndex: "entity_id" },
          { title: "Permission", dataIndex: "permission_code", render: (v: string | null) => v ?? "-" },
        ]}
      />
    </div>
  );
}
