"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Table, Button, Typography, Tag, message, Space, Tooltip, Popconfirm, Spin } from "antd";
import { EyeOutlined, EditOutlined, DeleteOutlined, UploadOutlined, HistoryOutlined } from "@ant-design/icons";
import type { InvoiceListRow } from "@/modules/invoice/types";
import { IdCell } from "@/components/IdCell";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { NoPermission } from "@/components/NoPermission";
import { PERMISSIONS } from "@/lib/permissions";
import { UploadInvoiceModal } from "@/modules/invoice-upload/UploadInvoiceModal";

export default function InvoicesPage() {
  const { loading: permissionsLoading, hasPermission } = useCurrentUser();
  const canRead = hasPermission(PERMISSIONS.INVOICES_READ);
  const canCreate = hasPermission(PERMISSIONS.INVOICES_CREATE);
  const canUpdate = hasPermission(PERMISSIONS.INVOICES_UPDATE);
  const canDelete = hasPermission(PERMISSIONS.INVOICES_DELETE);
  const canUpload = hasPermission(PERMISSIONS.INVOICES_UPLOADS_MANAGE);

  const [rows, setRows] = useState<InvoiceListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [reloadToken, setReloadToken] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    if (permissionsLoading || !canRead) return;

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
  }, [page, pageSize, permissionsLoading, canRead, reloadToken]);

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        message.error(json.error?.message ?? "Failed to delete invoice.");
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== id));
      setTotal((t) => t - 1);
      message.success("Invoice deleted.");
    } catch {
      message.error("Failed to delete invoice.");
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
        <NoPermission message="You do not have permission to view invoices." />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-4">
        <Typography.Title level={3} className="!mb-0">
          Invoices
        </Typography.Title>
        <Space>
          {canUpload && (
            <Link href="/invoices/upload-history">
              <Button icon={<HistoryOutlined />}>Upload History</Button>
            </Link>
          )}
          {canUpload && (
            <Button icon={<UploadOutlined />} onClick={() => setUploadOpen(true)}>
              Upload Invoice
            </Button>
          )}
          {canCreate && (
            <Link href="/invoices/new">
              <Button type="primary">New Invoice</Button>
            </Link>
          )}
        </Space>
      </div>
      {canUpload && (
        <UploadInvoiceModal
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          onDraftCreated={() => {
            setPage(1);
            setReloadToken((t) => t + 1);
          }}
        />
      )}
      <Table<InvoiceListRow>
        rowKey="id"
        loading={loading}
        dataSource={rows}
        scroll={{ x: 1200 }}
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
          { title: "Invoice Number", dataIndex: "invoice_number" },
          { title: "Invoice Date", dataIndex: "invoice_date" },
          { title: "Participant", dataIndex: "client_name", render: (v) => v ?? "-" },
          { title: "Provider", dataIndex: "provider_name", render: (v) => v ?? "-" },
          {
            title: "Amount",
            dataIndex: "amount",
            render: (v: string | null) => (v ? Number(v).toFixed(2) : "-"),
          },
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
            title: "Actions",
            key: "actions",
            width: 100,
            fixed: "right",
            render: (_, record) => (
              <Space size="middle">
                <Tooltip title="View">
                  <Link href={`/invoices/${record.id}`}>
                    <EyeOutlined style={{ color: "#1677ff" }} />
                  </Link>
                </Tooltip>
                {canUpdate && (
                  <Tooltip title="Edit">
                    <Link href={`/invoices/${record.id}?edit=true`}>
                      <EditOutlined style={{ color: "#fa8c16" }} />
                    </Link>
                  </Tooltip>
                )}
                {canDelete && (
                  <Popconfirm
                    title="Delete this invoice?"
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
