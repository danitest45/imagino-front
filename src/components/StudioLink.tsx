"use client";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
export default function StudioLink() {
  const { isAuthenticated } = useAuth();
  return (
    <Link href="/create/image" className="ui-button">
      {isAuthenticated ? "Open studio" : "Explore the studio"}
      <ArrowUpRight size={17} aria-hidden />
    </Link>
  );
}
