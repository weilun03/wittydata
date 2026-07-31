import dayjs, { type Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

// `invoice_item`/`rate_set` store start_date/end_date as `timestamptz`
// day-boundary instants (T00:00:00.000Z / T23:59:59.999Z). Formatting them
// with local-time `dayjs(v).format(...)` shifts the calendar date by a day
// in any timezone whose offset crosses that boundary — most visibly for
// end_date, where any positive UTC offset rolls it into the next day.
// Always decode these in UTC to get back the exact date that was stored.
export function formatUtcDate(value: string | null | undefined): string | undefined {
  return value ? dayjs.utc(value).format("YYYY-MM-DD") : undefined;
}

// Same fix, returning a UTC-mode Dayjs for antd DatePicker `initialValues`
// so the picker displays/edits the stored calendar date without a
// local-timezone shift.
export function parseUtcDate(value: string | null | undefined): Dayjs | undefined {
  return value ? dayjs.utc(value) : undefined;
}
