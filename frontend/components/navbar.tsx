"use client";

import Link from "next/link";
import { emitNavItemClicked, NAV_ITEM_IDS, NAV_PLACEMENTS, normalizeRoute } from "@/lib/telemetry/navigation-instrumentation";
import { OptimizedImage } from "./image";
import { ModernSearchInput } from "@/components/ui/modern-search-input";
import {
  Menu,
  X,
  Compass,
  ShoppingBag,
  Users,
  Lock,
  House,
  PlusSquare,
  Layers,
  Activity,
  Settings,
  Zap,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { WalletConnector } from "@/components/wallet/WalletConnector";
import { UserDropdown } from "./user-dropdown";
import { AccountEntryMenu } from "./account-entry-menu";
import { useAuth } from "@/lib/stores/auth-store";
import { useTranslation } from "@/hooks/useTranslation";
import { LanguageSwitcher, MobileLanguageSwitcher } from "./LanguageSwitcher";

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const hamburgerButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const wasMenuOpenRef = useRef(false);
  const { isAuthenticated, loading } = useAuth();
  const { t, locale } = useTranslation();

  const closeMenu = useCallback(() => setIsMenuOpen(false), []);
  const openMenu  = useCallback(() => setIsMenuOpen(true),  []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!isMenuOpen) return;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); closeMenu(); return; }
      if (event.key !== "Tab") return;
      const focusableElements = drawerRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusableElements || focusableElements.length === 0) return;
      const firstElement = focusableElements[0];
      const lastElement  = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === firstElement) { event.preventDefault(); lastElement.focus(); }
      else if (!event.shiftKey && document.activeElement === lastElement) { event.preventDefault(); firstElement.focus(); }
    };
    document.addEventListener("keydown", handleKeyDown);
    window.requestAnimationFrame(() => { closeButtonRef.current?.focus(); });
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeMenu, isMenuOpen]);

  useEffect(() => {
    if (wasMenuOpenRef.current && !isMenuOpen) hamburgerButtonRef.current?.focus();
    wasMenuOpenRef.current = isMenuOpen;
  }, [isMenuOpen]);

  function handleNavClick(e: React.MouseEvent, nav_item_id: string, placement: string, destination: string, menu_state = "unknown") {
    emitNavItemClicked({ nav_item_id, placement, destination_route: normalizeRoute(destination), menu_state, locale_source: locale, authenticated: isAuthenticated }, e.nativeEvent);
  }

  const navLinkBase = "text-sm font-medium tracking-wide text-[#8A9BB0] hover:text-white transition-all duration-300 flex items-center gap-1.5 relative group";
  const navLinkActive = "after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-gradient-to-r after:from-[#00D4FF] after:to-[#7B6FFF] after:transition-all after:duration-300 group-hover:after:w-full";

  return (
    <header
      className={`sticky top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-[#0D1117]/80 backdrop-blur-xl shadow-[0_1px_0_rgba(0,212,255,0.08),0_8px_32px_rgba(0,0,0,0.6)] border-b border-[#1E2D3D]/50"
          : "bg-gradient-to-b from-[#0D1117]/90 to-transparent backdrop-blur-md border-b border-transparent"
      } mt-[-80px]`}
    >
      {/* Premium accent line at top */}
      <div className={`absolute inset-x-0 top-0 h-[1px] transition-opacity duration-500 ${
        scrolled ? "opacity-0" : "opacity-100"
      } bg-gradient-to-r from-transparent via-[#00D4FF]/20 to-transparent`} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <nav className="flex items-center justify-between h-16 md:h-[4.5rem] relative" aria-label="Main navigation">

          {/* ── Logo ─────────────────────────────────────────── */}
          <Link href={`/${locale}`} className="flex items-center flex-shrink-0 group" aria-label="Stellar-LumenMint Home">
            <OptimizedImage
              src="/stellar-lumenmint-logo.svg"
              alt="Stellar-LumenMint"
              width={160}
              height={36}
              className="h-8 w-auto transition-transform duration-300 group-hover:scale-[1.02]"
              priority
              fallbackSrc="/images/fallbacks/collection-fallback.svg"
            />
          </Link>

          {/* ── Desktop nav links ─────────────────────────────── */}
          <div className="hidden xl:flex items-center justify-center space-x-1">
            {[
              { href: `/${locale}/explore`, id: NAV_ITEM_IDS.EXPLORE, icon: Compass, label: t("navigation.explore") },
              { href: `/${locale}/marketplace`, id: NAV_ITEM_IDS.MARKETPLACE, icon: ShoppingBag, label: t("navigation.marketplace") },
              { href: `/${locale}/artists`, id: NAV_ITEM_IDS.ARTISTS, icon: Users, label: t("navigation.artists") },
              { href: `/${locale}/vault`, id: NAV_ITEM_IDS.VAULT, icon: Lock, label: t("navigation.vault") },
            ].map(({ href, id, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                className={`${navLinkBase} ${navLinkActive} px-3 py-2 rounded-lg hover:bg-white/[0.04]`}
                onClick={e => handleNavClick(e, id, NAV_PLACEMENTS.NAVBAR_DESKTOP, href, "expanded")}
              >
                <Icon className="h-[15px] w-[15px]" />
                <span>{label}</span>
              </Link>
            ))}
          </div>

          {/* ── Right side ────────────────────────────────────── */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden xl:block">
              <ModernSearchInput
                placeholder={t("navigation.search")}
                className="w-[180px] lg:w-[210px]"
              />
            </div>
            <div className="hidden lg:block">
              <LanguageSwitcher />
            </div>
            {!loading && (
              isAuthenticated
                ? <UserDropdown />
                : (
                  <div className="flex items-center gap-2">
                    <WalletConnector />
                    <AccountEntryMenu />
                  </div>
                )
            )}
            {/* Mobile hamburger */}
            <button
              ref={hamburgerButtonRef}
              className="xl:hidden flex h-10 w-10 items-center justify-center rounded-xl bg-[#141B24] border border-[#1E2D3D] hover:border-[#00D4FF]/40 hover:bg-[#1C2433] transition-all duration-300 group"
              onClick={openMenu}
              aria-label="Open navigation menu"
              aria-expanded={isMenuOpen}
              aria-controls="mobile-navigation-drawer"
            >
              <Menu className="h-[18px] w-[18px] text-[#EEF2F7] group-hover:text-[#00D4FF] transition-colors duration-300" />
            </button>
          </div>
        </nav>
      </div>

      {/* ── Mobile drawer + backdrop ─────────────────────────── */}
      <div
        className={`xl:hidden fixed inset-0 z-[60] transition-opacity duration-400 ${
          isMenuOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!isMenuOpen}
      >
        {/* Backdrop */}
        <button
          className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-all duration-400 ${
            isMenuOpen ? "opacity-100" : "opacity-0"
          }`}
          aria-label="Close navigation menu"
          onClick={closeMenu}
        />

        {/* Drawer panel */}
        <aside
          id="mobile-navigation-drawer"
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
          className={`absolute left-0 top-0 h-full w-[80vw] max-w-sm border-r border-[#1E2D3D] bg-[#0D1117]/95 backdrop-blur-2xl shadow-2xl transition-transform duration-400 ease-out ${
            isMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-full flex-col overflow-y-auto">

            {/* Drawer header */}
            <div className="flex items-center justify-between border-b border-[#1E2D3D]/60 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#00D4FF]/20 to-[#7B6FFF]/20 border border-[#00D4FF]/20">
                  <Sparkles className="h-4 w-4 text-[#00D4FF]" />
                </div>
                <span className="text-sm font-semibold text-[#EEF2F7] tracking-wide">
                  Stellar<span className="text-[#00D4FF] font-light">-LumenMint</span>
                </span>
              </div>
              <button
                ref={closeButtonRef}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#1E2D3D] bg-[#141B24] hover:border-[#00D4FF]/40 hover:bg-[#1C2433] transition-all duration-300"
                onClick={closeMenu}
                aria-label="Close navigation menu"
              >
                <X className="h-4 w-4 text-[#EEF2F7]" />
              </button>
            </div>

            {/* Nav links */}
            <div className="px-4 py-5 space-y-1">
              {[
                { href: `/${locale}`,               id: NAV_ITEM_IDS.HOME,        icon: House,      label: "Home", desc: "Dashboard overview" },
                { href: `/${locale}/explore`,        id: NAV_ITEM_IDS.EXPLORE,     icon: Compass,    label: t("navigation.explore"), desc: "Discover NFTs" },
                { href: `/${locale}/marketplace`,    id: NAV_ITEM_IDS.MARKETPLACE, icon: ShoppingBag,label: t("navigation.marketplace"), desc: "Browse listings" },
                { href: `/${locale}/artists`,        id: NAV_ITEM_IDS.ARTISTS,     icon: Users,      label: t("navigation.artists"), desc: "Top creators" },
                { href: `/${locale}/vault`,          id: NAV_ITEM_IDS.VAULT,       icon: Lock,       label: t("navigation.vault"), desc: "Your collection" },
              ].map(({ href, id, icon: Icon, label, desc }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center justify-between gap-3 px-3 py-3 rounded-xl text-sm font-medium text-[#8A9BB0] hover:text-white hover:bg-[#141B24] hover:border hover:border-[#1E2D3D] transition-all duration-200 group"
                  onClick={e => { handleNavClick(e, id, NAV_PLACEMENTS.NAVBAR_MOBILE_DRAWER, href, "drawer_open"); closeMenu(); }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#141B24] group-hover:bg-[#1C2433] transition-colors border border-[#1E2D3D]">
                      <Icon className="h-4 w-4 flex-shrink-0 group-hover:text-[#00D4FF] transition-colors" />
                    </div>
                    <div>
                      <span>{label}</span>
                      <p className="text-xs text-[#6B7A8D]">{desc}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-40 transition-all duration-200 -translate-x-2 group-hover:translate-x-0" />
                </Link>
              ))}

              {/* Divider */}
              <div className="my-3 border-t border-[#1E2D3D]/40" />

              {/* Creator links */}
              {[
                { href: `/${locale}/creator-dashboard/create-your-collection`, id: NAV_ITEM_IDS.CREATE, icon: PlusSquare, label: "Create", desc: "Mint new NFT" },
                { href: `/${locale}/creator-dashboard/collections`, id: NAV_ITEM_IDS.COLLECTIONS, icon: Layers, label: "Collections", desc: "Manage NFTs" },
                { href: `/${locale}/creator-dashboard/sales`, id: NAV_ITEM_IDS.ACTIVITY, icon: Activity, label: "Activity", desc: "Sales & offers" },
              ].map(({ href, id, icon: Icon, label, desc }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center justify-between gap-3 px-3 py-3 rounded-xl text-sm font-medium text-[#8A9BB0] hover:text-white hover:bg-[#141B24] hover:border hover:border-[#1E2D3D] transition-all duration-200 group"
                  onClick={e => { handleNavClick(e, id, NAV_PLACEMENTS.NAVBAR_MOBILE_DRAWER, href, "drawer_open"); closeMenu(); }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#141B24] group-hover:bg-[#1C2433] transition-colors border border-[#1E2D3D]">
                      <Icon className="h-4 w-4 flex-shrink-0 group-hover:text-[#00D4FF] transition-colors" />
                    </div>
                    <div>
                      <span>{label}</span>
                      <p className="text-xs text-[#6B7A8D]">{desc}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-40 transition-all duration-200 -translate-x-2 group-hover:translate-x-0" />
                </Link>
              ))}

              {isAuthenticated && (
                <>
                  <Link
                    href={`/${locale}/creator-dashboard`}
                    className="flex items-center justify-between gap-3 px-3 py-3 rounded-xl text-sm font-medium text-[#8A9BB0] hover:text-white hover:bg-[#141B24] hover:border hover:border-[#1E2D3D] transition-all duration-200 group"
                    onClick={closeMenu}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#141B24] group-hover:bg-[#1C2433] transition-colors border border-[#1E2D3D]">
                        <Layers className="h-4 w-4 flex-shrink-0 group-hover:text-[#00D4FF] transition-colors" />
                      </div>
                      <div>
                        <span>{t("navigation.dashboard")}</span>
                        <p className="text-xs text-[#6B7A8D]">Creator tools</p>
                      </div>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-40 transition-all duration-200 -translate-x-2 group-hover:translate-x-0" />
                  </Link>
                  <Link
                    href={`/${locale}/creator-dashboard/settings`}
                    className="flex items-center justify-between gap-3 px-3 py-3 rounded-xl text-sm font-medium text-[#8A9BB0] hover:text-white hover:bg-[#141B24] hover:border hover:border-[#1E2D3D] transition-all duration-200 group"
                    onClick={closeMenu}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#141B24] group-hover:bg-[#1C2433] transition-colors border border-[#1E2D3D]">
                        <Settings className="h-4 w-4 flex-shrink-0 group-hover:text-[#00D4FF] transition-colors" />
                      </div>
                      <div>
                        <span>Settings</span>
                        <p className="text-xs text-[#6B7A8D]">Preferences</p>
                      </div>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-40 transition-all duration-200 -translate-x-2 group-hover:translate-x-0" />
                  </Link>
                </>
              )}
            </div>

            {/* Divider */}
            <div className="mx-5 border-t border-[#1E2D3D]/40" />

            {/* Mobile utilities */}
            <div className="px-5 py-4 space-y-4">
              <ModernSearchInput placeholder={t("navigation.search")} />
              <MobileLanguageSwitcher />
              {!loading && (
                isAuthenticated ? (
                  <Link
                    href={`/${locale}/creator-dashboard`}
                    className="flex items-center justify-center gap-2 w-full rounded-xl px-5 py-3 bg-gradient-to-r from-[#00D4FF] to-[#00A8CC] text-[#0D1117] font-semibold text-sm hover:from-[#00A8CC] hover:to-[#0099BB] transition-all duration-300 shadow-lg shadow-[#00D4FF]/20"
                    onClick={closeMenu}
                  >
                    <Zap className="h-4 w-4" />
                    {t("navigation.dashboard")}
                  </Link>
                ) : (
                  <WalletConnector forceVisible fullWidth />
                )
              )}
            </div>

            {/* Premium footer */}
            <div className="mt-auto px-5 py-4 border-t border-[#1E2D3D]/40">
              <div className="flex items-center gap-2 text-xs text-[#6B7A8D]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Stellar Network · Connected
              </div>
            </div>
          </div>
        </aside>
      </div>
    </header>
  );
}
