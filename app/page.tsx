"use client";

import Link from "next/link";
import { Button, Typography } from "antd";
import { PERMISSIONS } from "@/lib/permissions";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const BUTTONS = [
  { label: "Go to Participants", href: "/clients", permission: PERMISSIONS.CLIENTS_READ },
  { label: "Go to Providers", href: "/providers", permission: PERMISSIONS.PROVIDERS_READ },
  { label: "Go to Rate Sets", href: "/rate-sets", permission: PERMISSIONS.RATE_SETS_READ },
  { label: "Go to Invoices", href: "/invoices", permission: PERMISSIONS.INVOICES_READ },
  { label: "Go to Users", href: "/users", permission: PERMISSIONS.USERS_READ },
  { label: "Go to User Roles", href: "/roles", permission: PERMISSIONS.USER_ROLES_READ },
  { label: "Go to Genders", href: "/genders", permission: PERMISSIONS.GENDERS_READ },
  { label: "Go to Auth Sessions", href: "/sessions", permission: PERMISSIONS.AUTH_SESSIONS_READ },
  { label: "Go to Audit Logs", href: "/audit-logs", permission: PERMISSIONS.AUDIT_LOGS_READ },
];

export default function Home() {
  const { hasPermission } = useCurrentUser();

  const visibleButtons = BUTTONS.filter((button) => hasPermission(button.permission));

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-16">
      <Typography.Title level={2}>NDIS Invoice Management System</Typography.Title>
      <div className="flex flex-wrap justify-center gap-4">
        {visibleButtons.map((button) => (
          <Link key={button.href} href={button.href}>
            <Button type="primary">{button.label}</Button>
          </Link>
        ))}
      </div>
    </div>
  );
}
