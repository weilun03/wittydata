import dayjs from "dayjs";
import { RelativeTimeCell } from "./RelativeTimeCell";

export function IdCell({
  id,
  createdAt,
  updatedAt,
}: {
  id: number;
  createdAt: string;
  updatedAt: string;
}) {
  return (
    <div>
      <div className="font-medium">#{id}</div>
      <div className="text-xs text-gray-500">Created {dayjs(createdAt).format("YYYY-MM-DD HH:mm")}</div>
      <div className="text-xs text-gray-500">
        Updated <RelativeTimeCell value={updatedAt} />
      </div>
    </div>
  );
}
