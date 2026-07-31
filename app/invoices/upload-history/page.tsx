"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dayjs from "dayjs";
import { Table, Typography, Tag, message, Spin, Button, Space, Tooltip } from "antd";
import { DownloadOutlined, UploadOutlined } from "@ant-design/icons";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { NoPermission } from "@/components/NoPermission";
import { PERMISSIONS } from "@/lib/permissions";
import { UploadInvoiceModal } from "@/modules/invoice-upload/UploadInvoiceModal";

interface UploadHistoryFile {
  id: string;
  original_name: string;
  content_type: string;
  size: number;
  processing_status: "queued" | "processing" | "draft_created" | "needs_review" | "failed";
  attempt_count: number;
  error_message: string | null;
  warnings: string[];
  invoice_id: number | null;
  ai_provider: string | null;
  model: string | null;
  created_at: string;
}

interface UploadHistoryBatch {
  id: string;
  status: string;
  file_count: number;
  total_size: number;
  error_message: string | null;
  uploader_name: string | null;
  created_at: string;
  files: UploadHistoryFile[];
}

const BATCH_STATUS_COLOR: Record<string, string> = {
  uploading: "default",
  uploaded: "default",
  processing: "blue",
  completed: "green",
  completed_with_errors: "orange",
  failed: "red",
};

const FILE_STATUS_COLOR: Record<UploadHistoryFile["processing_status"], string> = {
  queued: "default",
  processing: "blue",
  draft_created: "green",
  needs_review: "orange",
  failed: "red",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FilesTable({ files }: { files: UploadHistoryFile[] }) {
  return (
    <Table<UploadHistoryFile>
      rowKey="id"
      size="small"
      pagination={false}
      dataSource={files}
      columns={[
        {
          title: "File",
          key: "file",
          render: (_, f) => (
            <div>
              <div>{f.original_name}</div>
              <div className="text-xs text-gray-500">
                {f.content_type} · {formatBytes(f.size)}
              </div>
            </div>
          ),
        },
        {
          title: "Status",
          key: "status",
          render: (_, f) => (
            <div>
              <Tag color={FILE_STATUS_COLOR[f.processing_status]}>{f.processing_status}</Tag>
              {f.attempt_count > 1 && (
                <div className="text-xs text-gray-500">{f.attempt_count} attempts</div>
              )}
            </div>
          ),
        },
        {
          title: "AI Provider",
          key: "ai",
          render: (_, f) =>
            f.ai_provider ? (
              <div>
                <div>{f.ai_provider}</div>
                <div className="text-xs text-gray-500">{f.model}</div>
              </div>
            ) : (
              "-"
            ),
        },
        {
          title: "Issues",
          key: "issues",
          render: (_, f) =>
            f.error_message ? (
              <Tooltip title={f.error_message}>
                <span className="text-red-600">Error</span>
              </Tooltip>
            ) : f.warnings.length > 0 ? (
              <Tooltip title={<ul className="list-disc pl-4">{f.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>}>
                <span className="text-orange-500">{f.warnings.length} warning(s)</span>
              </Tooltip>
            ) : (
              "-"
            ),
        },
        {
          title: "Invoice",
          key: "invoice",
          render: (_, f) =>
            f.invoice_id ? (
              <Link href={`/invoices/${f.invoice_id}?edit=true`} className="text-blue-600">
                #{f.invoice_id}
              </Link>
            ) : (
              "-"
            ),
        },
        {
          title: "Uploaded",
          dataIndex: "created_at",
          render: (v: string) => dayjs(v).format("YYYY-MM-DD HH:mm"),
        },
        {
          title: "Actions",
          key: "actions",
          render: (_, f) => (
            <Tooltip title="View original PDF">
              <a href={`/api/invoices/upload-history/files/${f.id}/download`} target="_blank" rel="noreferrer">
                <DownloadOutlined style={{ color: "#1677ff" }} />
              </a>
            </Tooltip>
          ),
        },
      ]}
    />
  );
}

export default function InvoiceUploadHistoryPage() {
  const { loading: permissionsLoading, hasPermission } = useCurrentUser();
  const canManage = hasPermission(PERMISSIONS.INVOICES_UPLOADS_MANAGE);

  const [rows, setRows] = useState<UploadHistoryBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [reloadToken, setReloadToken] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    if (permissionsLoading || !canManage) return;

    let ignore = false;
    setLoading(true);
    fetch(`/api/invoices/upload-history?page=${page}&pageSize=${pageSize}`)
      .then((res) => res.json())
      .then((json) => {
        if (ignore) return;
        if (json.data) {
          setRows(json.data);
          setTotal(json.meta?.total ?? 0);
        }
      })
      .catch(() => message.error("Failed to load upload history."))
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [page, pageSize, permissionsLoading, canManage, reloadToken]);

  if (permissionsLoading) {
    return (
      <div className="p-8">
        <Spin />
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="p-8">
        <NoPermission message="You do not have permission to view invoice upload history." />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <Typography.Title level={3} className="!mb-0">
            Invoice Upload History
          </Typography.Title>
          <Typography.Text type="secondary">
            Monitor uploaded invoice batches, extraction results, and the drafts they created.
          </Typography.Text>
        </div>
        <Space>
          <Button icon={<UploadOutlined />} type="primary" onClick={() => setUploadOpen(true)}>
            Upload Invoice
          </Button>
        </Space>
      </div>

      <UploadInvoiceModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onDraftCreated={() => {
          setPage(1);
          setReloadToken((t) => t + 1);
        }}
      />

      <Table<UploadHistoryBatch>
        rowKey="id"
        loading={loading}
        dataSource={rows}
        scroll={{ x: "max-content" }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} batches`,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
        expandable={{
          expandedRowRender: (batch) => <FilesTable files={batch.files} />,
          defaultExpandAllRows: true,
        }}
        columns={[
          {
            title: "Uploaded",
            key: "uploaded",
            render: (_, batch) => (
              <div>
                <div>{dayjs(batch.created_at).format("YYYY-MM-DD HH:mm")}</div>
                <div className="text-xs text-gray-500">{batch.uploader_name ?? "-"}</div>
              </div>
            ),
          },
          {
            title: "Status",
            dataIndex: "status",
            render: (status: string) => <Tag color={BATCH_STATUS_COLOR[status] ?? "default"}>{status}</Tag>,
          },
          { title: "Files", dataIndex: "file_count" },
          {
            title: "Size",
            dataIndex: "total_size",
            render: (v: number) => formatBytes(v),
          },
          {
            title: "Error",
            dataIndex: "error_message",
            render: (v: string | null) => v ?? "-",
          },
        ]}
      />
    </div>
  );
}
