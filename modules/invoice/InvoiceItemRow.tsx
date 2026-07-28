"use client";

import { useEffect, useState } from "react";
import { Button, DatePicker, InputNumber, Select, Typography } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import type { RateSetCategoryOption, SupportItemOption } from "@/modules/invoice/types";

export interface InvoiceItemValue {
  key: string;
  category_id?: number;
  support_item_id?: number;
  start_date?: string;
  end_date?: string;
  unit?: number;
  input_rate?: number;
}

interface InvoiceItemRowProps {
  value: InvoiceItemValue;
  onChange: (next: Partial<InvoiceItemValue>) => void;
  onRemove: () => void;
  clientId?: number;
}

export function InvoiceItemRow({ value, onChange, onRemove, clientId }: InvoiceItemRowProps) {
  const [categories, setCategories] = useState<RateSetCategoryOption[]>([]);
  const [supportItems, setSupportItems] = useState<SupportItemOption[]>([]);
  const [rateSet, setRateSet] = useState<{ id: number; name: string } | null>(null);
  const [ambiguous, setAmbiguous] = useState(false);
  const [maxRate, setMaxRate] = useState<string | null>(null);

  useEffect(() => {
    if (!value.start_date || !value.end_date) {
      setCategories([]);
      setRateSet(null);
      setAmbiguous(false);
      return;
    }
    let ignore = false;
    fetch(`/api/invoice-lookup/rate-set?start_date=${value.start_date}&end_date=${value.end_date}`)
      .then((res) => res.json())
      .then((json) => {
        if (ignore) return;
        const data = json.data ?? {};
        setRateSet(data.rateSet ? { id: data.rateSet.id, name: data.rateSet.name } : null);
        setAmbiguous(!!data.ambiguous);
        setCategories(data.categories ?? []);
      });
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.start_date, value.end_date]);

  useEffect(() => {
    if (!value.category_id) {
      setSupportItems([]);
      return;
    }
    let ignore = false;
    fetch(`/api/invoice-lookup/support-items?category_id=${value.category_id}`)
      .then((res) => res.json())
      .then((json) => {
        if (!ignore) setSupportItems(json.data ?? []);
      });
    return () => {
      ignore = true;
    };
  }, [value.category_id]);

  useEffect(() => {
    if (!rateSet?.id || !value.support_item_id || !value.start_date || !value.end_date || !clientId) {
      setMaxRate(null);
      return;
    }
    let ignore = false;
    const params = new URLSearchParams({
      rate_set_id: String(rateSet.id),
      support_item_id: String(value.support_item_id),
      client_id: String(clientId),
      start_date: value.start_date,
      end_date: value.end_date,
    });
    fetch(`/api/invoice-lookup/max-rate?${params}`)
      .then((res) => res.json())
      .then((json) => {
        if (!ignore) setMaxRate(json.data?.maxRate ?? null);
      });
    return () => {
      ignore = true;
    };
  }, [rateSet?.id, value.support_item_id, value.start_date, value.end_date, clientId]);

  const amountPreview =
    value.unit != null && value.input_rate != null
      ? (value.unit * value.input_rate).toFixed(2)
      : "-";

  return (
    <div className="border rounded p-3 mb-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <div className="text-xs text-gray-500 mb-1">Start Date</div>
          <DatePicker
            className="w-full"
            format="YYYY-MM-DD"
            value={value.start_date ? dayjs(value.start_date) : undefined}
            onChange={(d: Dayjs | null) =>
              onChange({ start_date: d ? d.format("YYYY-MM-DD") : undefined, category_id: undefined, support_item_id: undefined })
            }
          />
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">End Date</div>
          <DatePicker
            className="w-full"
            format="YYYY-MM-DD"
            value={value.end_date ? dayjs(value.end_date) : undefined}
            onChange={(d: Dayjs | null) =>
              onChange({ end_date: d ? d.format("YYYY-MM-DD") : undefined, category_id: undefined, support_item_id: undefined })
            }
          />
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Category</div>
          <Select
            className="w-full"
            allowClear
            value={value.category_id}
            options={categories.map((c) => ({ value: c.id, label: `${c.category_number} - ${c.category_name}` }))}
            onChange={(v) => onChange({ category_id: v, support_item_id: undefined })}
            disabled={categories.length === 0}
          />
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Support Item</div>
          <Select
            className="w-full"
            allowClear
            value={value.support_item_id}
            options={supportItems.map((s) => ({ value: s.id, label: `${s.item_number} - ${s.item_name}` }))}
            onChange={(v) => onChange({ support_item_id: v })}
            disabled={supportItems.length === 0}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
        <div>
          <div className="text-xs text-gray-500 mb-1">Unit</div>
          <InputNumber
            className="w-full"
            min={0}
            value={value.unit}
            onChange={(v) => onChange({ unit: v ?? undefined })}
          />
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Input Rate</div>
          <InputNumber
            className="w-full"
            min={0}
            value={value.input_rate}
            onChange={(v) => onChange({ input_rate: v ?? undefined })}
          />
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Max Rate</div>
          <div className="pt-1">{maxRate ?? "-"}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Amount</div>
          <div className="pt-1">{amountPreview}</div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <Typography.Text type="secondary" className="text-xs">
          {ambiguous
            ? "Multiple rate sets match this date range."
            : rateSet
              ? `Rate set: ${rateSet.name}`
              : value.start_date && value.end_date
                ? "No rate set matches this date range."
                : ""}
        </Typography.Text>
        <Button danger size="small" onClick={onRemove}>
          Remove
        </Button>
      </div>
    </div>
  );
}
