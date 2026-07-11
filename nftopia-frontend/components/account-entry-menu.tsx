"use client";

import { useState, useRef, useEffect } from "react";
import { UserCircle } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";

export function AccountEntryMenu() {
  const { locale } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Account"
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-900/40 border border-gray-800/50 hover:bg-purple-600/20 transition-colors"
      >
        <UserCircle className="w-5 h-5 text-white" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-40 rounded-lg border border-purple-500/20 bg-[#181359] shadow-xl py-1 z-50"
        >
          <Link
            href={`/${locale}/auth/login`}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-white hover:bg-purple-600/20 transition-colors"
          >
            Login
          </Link>
          <Link
            href={`/${locale}/auth/register`}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-white hover:bg-purple-600/20 transition-colors"
          >
            Register
          </Link>
        </div>
      )}
    </div>
  );
}
