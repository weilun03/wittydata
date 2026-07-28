"use client";

import { Button } from "antd";
import { InvoiceItemRow, type InvoiceItemValue } from "@/app/_screens/invoice/InvoiceItemRow";

interface InvoiceItemsEditorProps {
  value: InvoiceItemValue[];
  onChange: (items: InvoiceItemValue[]) => void;
  clientId?: number;
}

let keyCounter = 0;
function newKey() {
  keyCounter += 1;
  return `item-${Date.now()}-${keyCounter}`;
}

export function InvoiceItemsEditor({ value, onChange, clientId }: InvoiceItemsEditorProps) {
  const addRow = () => onChange([...value, { key: newKey() }]);
  const updateRow = (key: string, next: Partial<InvoiceItemValue>) =>
    onChange(value.map((row) => (row.key === key ? { ...row, ...next } : row)));
  const removeRow = (key: string) => onChange(value.filter((row) => row.key !== key));

  return (
    <div>
      {value.map((row) => (
        <InvoiceItemRow
          key={row.key}
          value={row}
          onChange={(next) => updateRow(row.key, next)}
          onRemove={() => removeRow(row.key)}
          clientId={clientId}
        />
      ))}
      <Button onClick={addRow}>Add Item</Button>
    </div>
  );
}

export function newInvoiceItemRow(): InvoiceItemValue {
  return { key: newKey() };
}
