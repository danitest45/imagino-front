"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Coins, LogIn, LogOut, Menu } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getCredits } from "../../lib/api";
import { toast } from "../../lib/toast";
import Appearance from "../Appearance";
import BrandMark from "../BrandMark";
import { Dialog } from "../ui/Dialog";
import { destinationForPath, workspaceNavigation, type WorkspaceDestination } from "./navigation";
import "./shell.css";

export interface AppShellPreview {
  active: WorkspaceDestination;
  credits?: number;
  onNavigate?: (destination: WorkspaceDestination) => void;
}

export default function AppShell({ children, preview }: { children: ReactNode; preview?: AppShellPreview }) {
  const pathname = usePathname();
  const router = useRouter();
  const { token, isAuthenticated, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [balance, setBalance] = useState<{ token: string; value: number | null } | null>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const sample = !!preview;
  const active = preview?.active ?? destinationForPath(pathname);

  useEffect(() => {
    if (!token || sample) return;
    let current = true;
    let revision = 0;
    const refresh = () => {
      const request = ++revision;
      getCredits().then(value => {
        if (current && request === revision) setBalance({ token, value });
      }).catch(() => {
        if (current && request === revision) setBalance({ token, value: null });
      });
    };
    refresh();
    window.addEventListener("imagino-credits-changed", refresh);
    window.addEventListener("creditsUpdated", refresh);
    return () => {
      current = false;
      window.removeEventListener("imagino-credits-changed", refresh);
      window.removeEventListener("creditsUpdated", refresh);
    };
  }, [token, sample]);

  useEffect(() => { setMobileOpen(false); }, [pathname, active]);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1120px)");
    const closeDesktopDrawer = () => { if (desktop.matches) setMobileOpen(false); };
    desktop.addEventListener("change", closeDesktopDrawer);
    return () => desktop.removeEventListener("change", closeDesktopDrawer);
  }, []);

  const credits = sample ? preview?.credits ?? null : token && balance?.token === token ? balance.value : null;
  const balanceLabel = sample
    ? credits === null ? "Sample balance" : `${credits.toLocaleString("en-US")} sample credits`
    : !isAuthenticated ? "Sign in to see balance"
    : balance?.token !== token ? "Loading balance…"
    : credits === null ? "Balance unavailable" : `${credits.toLocaleString("en-US")} credits`;

  function navigatePreview(destination: WorkspaceDestination) {
    setMobileOpen(false);
    preview?.onNavigate?.(destination);
  }

  function navigationItem(item: typeof workspaceNavigation[number]) {
    const content = <><item.Icon size={19} aria-hidden /><span>{item.label}</span></>;
    const className = `app-shell-nav-item${active === item.id ? " is-active" : ""}`;
    return sample ? <button type="button" key={item.id} className={className} aria-current={active === item.id ? "page" : undefined} onClick={() => navigatePreview(item.id)}>{content}</button>
      : <Link key={item.id} href={item.href} className={className} aria-current={active === item.id ? "page" : undefined} onClick={() => { if (pathname === item.href) setMobileOpen(false); }}>{content}</Link>;
  }

  const balanceContent = <><span className="app-shell-balance-heading"><Coins size={17} aria-hidden /> Credits</span><strong>{balanceLabel}</strong><span>{sample ? "Design preview · sample data" : "Quoted before you create"}</span></>;
  const navigation = <>
    <nav className="app-shell-navigation" aria-label="Workspace navigation">
      <p className="app-shell-section-label">Create</p>
      {workspaceNavigation.filter(item => item.section === "create").map(navigationItem)}
      <div className="app-shell-assets-link">{workspaceNavigation.filter(item => item.section === "assets").map(navigationItem)}</div>
    </nav>
    <div className="app-shell-utilities">
      {sample ? <button type="button" className="app-shell-balance" onClick={() => navigatePreview("account")}>{balanceContent}</button> : <Link href="/profile" className="app-shell-balance" onClick={() => { if (pathname === "/profile") setMobileOpen(false); }}>{balanceContent}</Link>}
      <nav aria-label="Workspace utilities">{workspaceNavigation.filter(item => item.section === "utilities").map(navigationItem)}</nav>
      <Appearance />
      {!sample && (isAuthenticated ? <button className="app-shell-nav-item app-shell-sign-out" type="button" disabled={signingOut} onClick={() => {
        if (signingOut) return;
        setSigningOut(true);
        void logout().catch(() => toast("Signed out locally. The server could not confirm session revocation.", "error")).finally(() => { setSigningOut(false); router.push("/"); });
      }}><LogOut size={18} aria-hidden /><span>{signingOut ? "Signing out…" : "Sign out"}</span></button> : <Link className="app-shell-nav-item" href="/login"><LogIn size={18} aria-hidden /><span>Sign in</span></Link>)}
    </div>
  </>;

  return <div className={`app-shell${sample ? " app-shell-preview" : ""}`}>
    <aside className="app-shell-sidebar" aria-label="Creative workspace">
      {sample ? <span className="brand app-shell-brand" role="img" aria-label="Imagino design preview"><BrandMark /></span> : <Link href="/" className="brand app-shell-brand" aria-label="Imagino home"><BrandMark /></Link>}
      {navigation}
    </aside>
    <div className="app-shell-main">
      <header className="app-shell-mobile-bar">
        <button type="button" ref={menuTrigger} className="ui-icon-button" aria-label="Open workspace navigation" aria-expanded={mobileOpen} aria-haspopup="dialog" onClick={() => setMobileOpen(true)}><Menu size={21} aria-hidden /></button>
        <span className="brand app-shell-mobile-brand"><BrandMark /></span>
        <span className="app-shell-current-tool">{workspaceNavigation.find(item => item.id === active)?.label}</span>
      </header>
      <div className="app-shell-content">{children}</div>
    </div>
    <Dialog open={mobileOpen} onClose={() => setMobileOpen(false)} title="Workspace navigation" closeLabel="Close workspace navigation" className="app-shell-drawer" returnFocusTo={menuTrigger.current}>
      <div className="app-shell-drawer-content">{navigation}</div>
    </Dialog>
  </div>;
}
