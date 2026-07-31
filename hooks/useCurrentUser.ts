"use client";

import { useEffect, useState } from "react";
import type { PermissionCode } from "@/lib/permissions";

interface CurrentUser {
  user: { id: number; email: string; full_name: string };
  role: { id: number; code: string; label: string };
  permissions: string[];
}

export function useCurrentUser() {
  const [current, setCurrent] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((json) => {
        if (!ignore) setCurrent(json.data ?? null);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const hasPermission = (permission: PermissionCode) =>
    current?.permissions.includes(permission) ?? false;

  return { current, loading, hasPermission };
}
