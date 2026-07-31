"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Layout, Menu, Button } from "antd";

interface CurrentUser {
  user: { id: number; email: string; full_name: string };
  role: { id: number; code: string; label: string };
  permissions: string[];
}

interface NavLeaf {
  key: string;
  label: string;
  href: string;
  permission: string | null;
}

interface NavGroup {
  key: string;
  label: string;
  children: NavLeaf[];
}

type NavEntry = NavLeaf | NavGroup;

function isGroup(item: NavEntry): item is NavGroup {
  return "children" in item;
}

const NAV_ITEMS: NavEntry[] = [
  { key: "/", label: "Dashboard", href: "/", permission: null },
  { key: "/clients", label: "Participants", href: "/clients", permission: "clients.read" },
  { key: "/providers", label: "Providers", href: "/providers", permission: "providers.read" },
  { key: "/rate-sets", label: "Rate Sets", href: "/rate-sets", permission: "rate_sets.read" },
  {
    key: "invoices",
    label: "Invoices",
    children: [
      { key: "/invoices", label: "Invoice List", href: "/invoices", permission: "invoices.read" },
      {
        key: "/invoices/upload-history",
        label: "Upload History",
        href: "/invoices/upload-history",
        permission: "invoices.uploads.manage",
      },
    ],
  },
  {
    key: "admin",
    label: "Administration",
    children: [
      { key: "/users", label: "Users", href: "/users", permission: "users.read" },
      { key: "/roles", label: "User Roles", href: "/roles", permission: "user_roles.read" },
      { key: "/genders", label: "Genders", href: "/genders", permission: "genders.read" },
      { key: "/sessions", label: "Auth Sessions", href: "/sessions", permission: "auth_sessions.read" },
      { key: "/audit-logs", label: "Audit Logs", href: "/audit-logs", permission: "audit_logs.read" },
    ],
  },
];

const ALL_LEAVES = NAV_ITEMS.flatMap((item) => (isGroup(item) ? item.children : [item]));

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [current, setCurrent] = useState<CurrentUser | null>(null);
  // Sub-routes (e.g. /invoices/upload-history) share a prefix with their parent
  // list route (/invoices) — pick the longest matching href so the more specific
  // nav item is the one highlighted, not the first one found in NAV_ITEMS order.
  const activeKey =
    ALL_LEAVES.filter((item) => (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)))
      .sort((a, b) => b.href.length - a.href.length)[0]?.key ?? pathname;

  // proxy.ts only checks that a session cookie is present (optimistic). This is the
  // authoritative check: it hits the DB (via /api/auth/me) so a cookie left over from
  // an expired or admin-revoked session still gets bounced to /login, including on
  // client-side navigations between pages that proxy.ts never sees. It also doubles
  // as the source of the current user/permissions the nav and header need.
  useEffect(() => {
    if (pathname === "/login") return;

    let ignore = false;
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((json) => {
        if (ignore) return;
        if (json.data == null) {
          router.push("/login");
          return;
        }
        setCurrent(json.data);
      })
      .catch(() => {});

    return () => {
      ignore = true;
    };
  }, [pathname, router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  // The login page renders without app chrome — there's no session yet to show nav for.
  if (pathname === "/login") {
    return <div className="flex flex-1 flex-col min-h-full">{children}</div>;
  }

  const hasPermission = (permission: string | null) =>
    permission === null || (current?.permissions.includes(permission) ?? false);

  const menuItems = NAV_ITEMS.map((item) => {
    if (isGroup(item)) {
      const visibleChildren = item.children.filter((child) => hasPermission(child.permission));
      if (visibleChildren.length === 0) return null;
      return {
        key: item.key,
        label: item.label,
        children: visibleChildren.map((child) => ({
          key: child.key,
          label: <Link href={child.href}>{child.label}</Link>,
        })),
      };
    }
    if (!hasPermission(item.permission)) return null;
    return { key: item.key, label: <Link href={item.href}>{item.label}</Link> };
  }).filter((item): item is NonNullable<typeof item> => item !== null);

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
          defaultOpenKeys={["admin", "invoices"]}
          items={menuItems}
        />
      </Layout.Sider>
      <Layout>
        <Layout.Header className="flex items-center justify-between !px-6">
          <span className="text-white font-semibold">NDIS Invoice Management System</span>
          {current && (
            <div className="flex items-center gap-4">
              <Link href="/account" className="text-white/85 hover:text-white">
                {current.user.full_name} ({current.role.label})
              </Link>
              <Button size="small" onClick={handleLogout}>
                Log out
              </Button>
            </div>
          )}
        </Layout.Header>
        <Layout.Content style={{ background: "#f0f2f5" }}>{children}</Layout.Content>
      </Layout>
    </Layout>
  );
}
