"use client";

import Link from "next/link";
import { Button } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";

export function BackButton({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href}>
      <Button type="text" icon={<ArrowLeftOutlined />} className="!px-0 mb-4">
        {label}
      </Button>
    </Link>
  );
}
