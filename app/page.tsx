"use client";

import Link from "next/link";
import { Button, Typography } from "antd";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-16">
      <Typography.Title level={2}>NDIS Invoice Management System</Typography.Title>
      <div className="flex gap-4">
        <Link href="/clients">
          <Button type="primary">Go to Participants</Button>
        </Link>
        <Link href="/providers">
          <Button type="primary">Go to Providers</Button>
        </Link>
        <Link href="/rate-sets">
          <Button type="primary">Go to Rate Sets</Button>
        </Link>
        <Link href="/invoices">
          <Button type="primary">Go to Invoices</Button>
        </Link>
      </div>
    </div>
  );
}
