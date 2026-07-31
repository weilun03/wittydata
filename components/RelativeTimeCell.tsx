import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Tooltip } from "antd";

dayjs.extend(relativeTime);

export function RelativeTimeCell({ value }: { value: string }) {
  return (
    <Tooltip title={dayjs(value).format("YYYY-MM-DD HH:mm:ss")}>
      <span>{dayjs(value).fromNow()}</span>
    </Tooltip>
  );
}
