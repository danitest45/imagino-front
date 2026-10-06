import { Image as ImageIcon, Video, Layers3, UserRound } from "lucide-react";

export type WorkspaceDestination = "image" | "video" | "assets" | "account";

/** Only implemented destinations belong here; capabilities can add future tools. */
export const workspaceNavigation = [
  { id: "image", href: "/create/image", label: "Image", Icon: ImageIcon, section: "create" },
  { id: "video", href: "/create/video", label: "Video", Icon: Video, section: "create" },
  { id: "assets", href: "/library", label: "Assets", Icon: Layers3, section: "assets" },
  { id: "account", href: "/profile", label: "Account", Icon: UserRound, section: "utilities" },
] as const;

export function isWorkspaceRoute(path: string) {
  return /^\/(create(?:\/|$)|library(?:\/|$)|profile(?:\/|$))/.test(path);
}

export function destinationForPath(path: string): WorkspaceDestination {
  return workspaceNavigation.find(item => path === item.href || path.startsWith(`${item.href}/`))?.id ?? "image";
}
