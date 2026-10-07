"use client";
import { usePathname } from "next/navigation";
import AppShell from "./shell/AppShell";
import { isWorkspaceRoute } from "./shell/navigation";
export default function RouteSurface({
  children,
}: {
  children: React.ReactNode;
}) {
  const path = usePathname();
  if (isWorkspaceRoute(path)) return <AppShell>{children}</AppShell>;
  const legacy = /^\/(images|videos|google-auth)(\/|$)/.test(path);
  return (
    <div className={legacy ? "legacy-surface" : undefined}>{children}</div>
  );
}
