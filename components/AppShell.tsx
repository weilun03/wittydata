"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Layout, Menu } from "antd";

const NAV_ITEMS = [
  { key: "/", label: "Dashboard", href: "/" },
  { key: "/clients", label: "Participants", href: "/clients" },
  { key: "/providers", label: "Providers", href: "/providers" },
  { key: "/rate-sets", label: "Rate Sets", href: "/rate-sets" },
  { key: "/invoices", label: "Invoices", href: "/invoices" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeKey =
    NAV_ITEMS.find((item) => (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)))
      ?.key ?? pathname;

  return (
    <Layout className="min-h-full">
      <Layout.Sider theme="dark" width={220}>
        <div className="flex items-center h-16 px-6 text-white font-semibold whitespace-nowrap bg-black/25 border-b border-white/10">
          NDIS Invoicing
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[activeKey]}
          items={NAV_ITEMS.map((item) => ({
            key: item.key,
            label: <Link href={item.href}>{item.label}</Link>,
          }))}
        />
      </Layout.Sider>
      <Layout>
        <Layout.Header className="flex items-center !px-6">
          <span className="text-white font-semibold">NDIS Invoice Management System</span>
        </Layout.Header>
        <Layout.Content>{children}</Layout.Content>
      </Layout>
    </Layout>
  );
}
