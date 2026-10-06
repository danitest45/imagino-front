"use client";
import { usePathname } from "next/navigation";
export default function RouteSurface({
  children,
}: {
  children: React.ReactNode;
}) {
  const path = usePathname();
  const legacy = /^\/(images|videos|google-auth)(\/|$)/.test(path);
  return (
    <div className={legacy ? "legacy-surface" : undefined}>{children}</div>
  );
}
