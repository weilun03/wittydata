"use client";

import { useState } from "react";
import { Alert, Button, Card, Descriptions, Upload, message, Typography } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import type { UploadFile } from "antd/es/upload/interface";
import type { RateSetImportSummary } from "@/modules/rate-set-import/types";

interface ImportPanelProps {
  rateSetId: number;
}

export function ImportPanel({ rateSetId }: ImportPanelProps) {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [importing, setImporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [summary, setSummary] = useState<RateSetImportSummary | null>(null);

  const handleImport = async () => {
    const file = fileList[0]?.originFileObj;
    if (!file) {
      setErrorMessage("Please choose an Excel (.xlsx) file first.");
      return;
    }

    setImporting(true);
    setErrorMessage(null);
    setSummary(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/rate-sets/${rateSetId}/import`, {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMessage(json.error?.message ?? "Failed to import the Excel file.");
        return;
      }
      setSummary(json.data);
      message.success("Import completed.");
    } catch {
      setErrorMessage("Failed to import the Excel file.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card className="max-w-2xl">
      <Typography.Title level={4}>Import NDIS Excel Pricing File</Typography.Title>

      {errorMessage && <Alert type="error" title={errorMessage} showIcon className="mb-4" />}

      <Upload
        accept=".xlsx"
        maxCount={1}
        fileList={fileList}
        beforeUpload={() => false}
        onChange={({ fileList: fl }) => setFileList(fl)}
      >
        <Button icon={<UploadOutlined />}>Choose Excel File</Button>
      </Upload>

      <Button
        type="primary"
        className="mt-4"
        loading={importing}
        disabled={fileList.length === 0}
        onClick={handleImport}
      >
        Import
      </Button>

      {summary && (
        <div className="mt-6">
          <Descriptions bordered column={1} size="small" title="Import Summary">
            <Descriptions.Item label="Sheets Processed">
              {summary.sheetsProcessed.join(", ") || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Sheets Skipped">
              {summary.sheetsSkipped.join(", ") || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Rows Processed">{summary.rowsProcessed}</Descriptions.Item>
            <Descriptions.Item label="Categories">
              {summary.categories.inserted} inserted, {summary.categories.updated} updated,{" "}
              {summary.categories.deactivated} deactivated, {summary.categories.unchanged} unchanged
            </Descriptions.Item>
            <Descriptions.Item label="Support Items">
              {summary.supportItems.inserted} inserted, {summary.supportItems.updated} updated,{" "}
              {summary.supportItems.deactivated} deactivated, {summary.supportItems.unchanged} unchanged
            </Descriptions.Item>
            <Descriptions.Item label="Prices">
              {summary.prices.inserted} inserted, {summary.prices.updated} updated,{" "}
              {summary.prices.deleted} deleted, {summary.prices.unchanged} unchanged
            </Descriptions.Item>
          </Descriptions>

          {summary.warnings.length > 0 && (
            <Alert
              className="mt-4"
              type="warning"
              showIcon
              title={`${summary.warnings.length} warning(s)`}
              description={
                <ul className="list-disc pl-4">
                  {summary.warnings.slice(0, 20).map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              }
            />
          )}
        </div>
      )}
    </Card>
  );
}
