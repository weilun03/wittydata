"use client";

import { useState } from "react";
import Link from "next/link";
import { Modal, Upload, Button, Alert, Descriptions, Typography, message } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import type { UploadFile } from "antd/es/upload/interface";

interface UploadResult {
  fileId: string;
  processingStatus: "draft_created" | "needs_review" | "failed";
  invoiceId: number | null;
  warnings: string[];
  errorMessage: string | null;
  extraction: {
    participant_name: string | null;
    provider_name: string | null;
    invoice_number: string | null;
    invoice_date: string | null;
    stated_invoice_total: string | null;
  } | null;
}

interface UploadInvoiceModalProps {
  open: boolean;
  onClose: () => void;
  onDraftCreated: () => void;
}

const STATUS_LABEL: Record<UploadResult["processingStatus"], { text: string; type: "success" | "warning" | "error" }> = {
  draft_created: { text: "Draft created successfully", type: "success" },
  needs_review: { text: "Draft created — needs review", type: "warning" },
  failed: { text: "Could not create a draft", type: "error" },
};

export function UploadInvoiceModal({ open, onClose, onDraftCreated }: UploadInvoiceModalProps) {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const reset = () => {
    setFileList([]);
    setResult(null);
    setErrorMessage(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleUpload = async () => {
    const file = fileList[0]?.originFileObj;
    if (!file) {
      setErrorMessage("Please choose a PDF invoice first.");
      return;
    }

    setUploading(true);
    setErrorMessage(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/invoices/upload", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) {
        setErrorMessage(json.error?.message ?? "Failed to process the invoice.");
        return;
      }
      setResult(json.data);
      if (json.data.invoiceId) {
        onDraftCreated();
        message.success("Invoice draft created.");
      }
    } catch {
      setErrorMessage("Failed to process the invoice.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal open={open} onCancel={handleClose} footer={null} title="Upload Invoice" destroyOnHidden>
      {errorMessage && <Alert type="error" showIcon title={errorMessage} className="mb-4" />}

      {!result && (
        <>
          <Upload.Dragger
            accept="application/pdf,.pdf"
            maxCount={1}
            fileList={fileList}
            beforeUpload={() => false}
            onChange={({ fileList: fl }) => setFileList(fl)}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Click or drag a PDF invoice to this area</p>
            <p className="ant-upload-hint">Supported format: PDF. Maximum file size: 10MB.</p>
          </Upload.Dragger>

          <Button
            type="primary"
            className="mt-4"
            loading={uploading}
            disabled={fileList.length === 0}
            onClick={handleUpload}
          >
            Upload & Extract
          </Button>
        </>
      )}

      {result && (
        <div>
          <Alert
            type={STATUS_LABEL[result.processingStatus].type}
            showIcon
            title={STATUS_LABEL[result.processingStatus].text}
            description={result.errorMessage ?? undefined}
            className="mb-4"
          />

          {result.extraction && (
            <Descriptions bordered column={1} size="small" title="Extracted Data" className="mb-4">
              <Descriptions.Item label="Participant">
                {result.extraction.participant_name ?? "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Provider">{result.extraction.provider_name ?? "-"}</Descriptions.Item>
              <Descriptions.Item label="Invoice Number">
                {result.extraction.invoice_number ?? "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Invoice Date">
                {result.extraction.invoice_date ?? "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Stated Total">
                {result.extraction.stated_invoice_total ?? "-"}
              </Descriptions.Item>
            </Descriptions>
          )}

          {result.warnings.length > 0 && (
            <Alert
              type="warning"
              showIcon
              className="mb-4"
              title={`${result.warnings.length} item(s) need review`}
              description={
                <ul className="list-disc pl-4">
                  {result.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              }
            />
          )}

          <div className="flex justify-end gap-2">
            <Button onClick={reset}>Upload Another</Button>
            {result.invoiceId ? (
              <Link href={`/invoices/${result.invoiceId}?edit=true`}>
                <Button type="primary" onClick={handleClose}>
                  Review Draft
                </Button>
              </Link>
            ) : (
              <Button onClick={handleClose}>Close</Button>
            )}
          </div>
        </div>
      )}

      {!result && (
        <Typography.Paragraph type="secondary" className="mt-4 !mb-0">
          The extracted data will be used to create a draft invoice. You can review and correct it
          before completing.
        </Typography.Paragraph>
      )}
    </Modal>
  );
}
