import { Result } from "antd";

export function NoPermission({ message }: { message?: string }) {
  return (
    <Result
      status="403"
      title="403"
      subTitle={message ?? "You do not have permission to access this page."}
    />
  );
}
