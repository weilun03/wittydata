"use client";

import { useState } from "react";
import { Button, Pagination } from "antd";
import { InvoiceItemRow, type InvoiceItemValue } from "@/modules/invoice/InvoiceItemRow";

interface InvoiceItemsEditorProps {
  value: InvoiceItemValue[];
  onChange: (items: InvoiceItemValue[]) => void;
  clientId?: number;
}

// Capped at 20 (not the usual 10/20/50/100) because each row here fires up to
// three network lookups on mount plus several form controls — letting an
// admin pick 50/100 would reintroduce the exact rendering cost this
// pagination is meant to avoid.
const PAGE_SIZE_OPTIONS = [10, 20];

let keyCounter = 0;
function newKey() {
  keyCounter += 1;
  return `item-${Date.now()}-${keyCounter}`;
}

export function InvoiceItemsEditor({ value, onChange, clientId }: InvoiceItemsEditorProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  const pageCount = Math.max(1, Math.ceil(value.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = value.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const addRow = () => {
    onChange([...value, { key: newKey() }]);
    setPage(Math.ceil((value.length + 1) / pageSize));
  };
  const updateRow = (key: string, next: Partial<InvoiceItemValue>) =>
    onChange(value.map((row) => (row.key === key ? { ...row, ...next } : row)));
  const removeRow = (key: string) => onChange(value.filter((row) => row.key !== key));

  return (
    <div>
      <div className="text-sm text-gray-500 mb-2">
        {value.length} item{value.length === 1 ? "" : "s"} total
      </div>
      {visibleRows.map((row) => (
        <InvoiceItemRow
          key={row.key}
          value={row}
          onChange={(next) => updateRow(row.key, next)}
          onRemove={() => removeRow(row.key)}
          clientId={clientId}
        />
      ))}
      <div className="flex items-center justify-between mt-3">
        <Button onClick={addRow}>Add Item</Button>
        {value.length > PAGE_SIZE_OPTIONS[0] && (
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={value.length}
            showSizeChanger
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onChange={(p, ps) => {
              setPage(p);
              setPageSize(ps);
            }}
          />
        )}
      </div>
    </div>
  );
}

export function newInvoiceItemRow(): InvoiceItemValue {
  return { key: newKey() };
}
