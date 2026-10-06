"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, ArrowUpRight, UserRound, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getCredits } from "../lib/api";
import { IconButton } from "./ui/StudioUI";
import { toast } from "../lib/toast";
export default function Navbar() {
  const { token, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [balance, setBalance] = useState<{
    token: string;
    value: number;
  } | null>(null);
  const menu = useRef<HTMLButtonElement>(null);
  const marketing = pathname === "/" || pathname === "/pricing";
  const reviewing = pathname === "/design-review";
  const links = marketing
    ? [
        { href: "/#how-it-works", label: "How it works" },
        { href: "/#models", label: "Models" },
        { href: "/pricing", label: "Costs" },
      ]
    : [
        { href: "/create/image", label: "Create" },
        { href: "/library", label: "Library" },
      ];
  useEffect(() => {
    if (!token || reviewing) return;
    let current = true;
    let revision = 0;
    const refresh = () => {
      const request = ++revision;
      getCredits()
        .then((value) => {
          if (current && request === revision) setBalance({ token, value });
        })
        .catch(() => {
          if (current && request === revision) setBalance(null);
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
  }, [token, reviewing]);
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);
  const credits = token && balance?.token === token ? balance.value : null;
  return (
    <header
      className="site-header"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setMobileOpen(false);
          menu.current?.focus();
        }
      }}
    >
      <div className="nav-inner">
        <Link href="/" className="brand" aria-label="Imagino home">
          <Image
            src="/brand/wordmark.svg"
            width={133}
            height={34}
            alt="Imagino"
            priority
          />
        </Link>
        <nav
          aria-label="Main navigation"
          className={`nav-links ${marketing ? "marketing-links" : "app-links"}`}
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        {!marketing && (
          <span className="app-nav-label">AI CREATIVE WORKSPACE</span>
        )}
        <div className="nav-utilities">
          {isAuthenticated && !reviewing ? (
            <>
              <Link href="/profile" className="credit-link">
                {credits === null
                  ? "Balance unavailable"
                  : `${credits} credits`}
              </Link>
              <Link
                href="/profile"
                className="ui-icon-button"
                aria-label="Account"
              >
                <UserRound size={18} />
              </Link>
            </>
          ) : (
            <Link className="ui-button ghost" href="/login">
              Sign in
            </Link>
          )}
          {marketing && (
            <Link className="ui-button marketing-cta" href="/create/image">
              {isAuthenticated ? "Open studio" : "Explore the studio"}
              <ArrowUpRight size={16} />
            </Link>
          )}
          {marketing && (
            <button
              ref={menu}
              className="ui-icon-button nav-menu-button"
              aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={mobileOpen}
              aria-controls="mobile-navigation"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          )}
          {!marketing && isAuthenticated && (
            <IconButton
              label="Sign out"
              onClick={() => {
                void logout()
                  .catch(() =>
                    toast(
                      "Signed out locally. The server could not confirm session revocation.",
                      "error",
                    ),
                  )
                  .finally(() => router.push("/"));
              }}
            >
              <LogOut size={18} />
            </IconButton>
          )}
        </div>
      </div>
      {mobileOpen && (
        <nav
          id="mobile-navigation"
          className="mobile-nav"
          aria-label="Mobile navigation"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link href="/create/image" className="ui-button">
            Explore the studio
          </Link>
        </nav>
      )}
    </header>
  );
}
