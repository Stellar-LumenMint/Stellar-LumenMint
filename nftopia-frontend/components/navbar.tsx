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
    window.addEventListener("scroll", handleScroll);
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

  const navLinkBase = "text-sm font-medium tracking-wide text-[#8A9BB0] hover:text-white transition-colors duration-200 flex items-center gap-1.5 relative group";
  const navLinkActive = "after:absolute after:bottom-[-2px] after:left-0 after:w-0 after:h-[2px] after:bg-[#00D4FF] after:transition-all group-hover:after:w-full";

  return (
    <header
      className={`sticky top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#0D1117]/95 backdrop-blur-md shadow-[0_1px_0_rgba(0,212,255,0.08),0_4px_24px_rgba(0,0,0,0.5)]"
          : "bg-[#0D1117]/80 backdrop-blur-sm border-b border-[#1E2D3D]"
      } mt-[-80px]`}
    >
      <div className="max-w-7xl mx-auto px-4">
        <nav className="flex items-center justify-between h-16 md:h-[4.5rem] relative">

          {/* ── Logo ─────────────────────────────────────────── */}
          <Link href={`/${locale}`} className="flex items-center flex-shrink-0">
            <OptimizedImage
              src="/stellar-lumenmint-logo.svg"
              alt="Stellar-LumenMint"
              width={160}
              height={36}
              className="h-8 w-auto"
              priority
              fallbackSrc="/images/fallbacks/collection-fallback.svg"
            />
          </Link>

          {/* ── Desktop nav links ─────────────────────────────── */}
          <div className="hidden xl:flex items-center justify-center space-x-7">
            <Link href={`/${locale}/explore`} className={`${navLinkBase} ${navLinkActive}`}
              onClick={e => handleNavClick(e, NAV_ITEM_IDS.EXPLORE, NAV_PLACEMENTS.NAVBAR_DESKTOP, `/${locale}/explore`, "expanded")}>
              <Compass className="h-[15px] w-[15px]" />{t("navigation.explore")}
            </Link>
            <Link href={`/${locale}/marketplace`} className={`${navLinkBase} ${navLinkActive}`}
              onClick={e => handleNavClick(e, NAV_ITEM_IDS.MARKETPLACE, NAV_PLACEMENTS.NAVBAR_DESKTOP, `/${locale}/marketplace`, "expanded")}>
              <ShoppingBag className="h-[15px] w-[15px]" />{t("navigation.marketplace")}
            </Link>
            <Link href={`/${locale}/artists`} className={`${navLinkBase} ${navLinkActive}`}
              onClick={e => handleNavClick(e, NAV_ITEM_IDS.ARTISTS, NAV_PLACEMENTS.NAVBAR_DESKTOP, `/${locale}/artists`, "expanded")}>
              <Users className="h-[15px] w-[15px]" />{t("navigation.artists")}
            </Link>
            <Link href={`/${locale}/vault`} className={`${navLinkBase} ${navLinkActive}`}
              onClick={e => handleNavClick(e, NAV_ITEM_IDS.VAULT, NAV_PLACEMENTS.NAVBAR_DESKTOP, `/${locale}/vault`, "expanded")}>
              <Lock className="h-[15px] w-[15px]" />{t("navigation.vault")}
            </Link>
          </div>

          {/* ── Right side ────────────────────────────────────── */}
          <div className="flex items-center gap-3">
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
              className="xl:hidden flex h-10 w-10 items-center justify-center rounded-lg bg-[#141B24] border border-[#1E2D3D] hover:border-[#00D4FF]/40 transition-colors"
              onClick={openMenu}
              aria-label="Open navigation menu"
              aria-expanded={isMenuOpen}
              aria-controls="mobile-navigation-drawer"
            >
              <Menu className="h-[18px] w-[18px] text-[#EEF2F7]" />
            </button>
          </div>
        </nav>
      </div>

      {/* ── Mobile drawer + backdrop ─────────────────────────── */}
      <div
        className={`xl:hidden fixed inset-0 z-[60] transition-opacity duration-300 ${
          isMenuOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!isMenuOpen}
      >
        {/* Backdrop */}
        <button
          className={`absolute inset-0 bg-black/65 backdrop-blur-sm transition-opacity duration-300 ${
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
          className={`absolute left-0 top-0 h-full w-[80vw] max-w-sm border-r border-[#1E2D3D] bg-[#0D1117] shadow-2xl transition-transform duration-300 ease-out ${
            isMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-full flex-col overflow-y-auto">

            {/* Drawer header */}
            <div className="flex items-center justify-between border-b border-[#1E2D3D] px-5 py-4">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-[#00D4FF]" />
                <span className="text-sm font-semibold text-[#EEF2F7] tracking-wide">
                  Stellar<span className="text-[#00D4FF] font-light">-LumenMint</span>
                </span>
              </div>
              <button
                ref={closeButtonRef}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#1E2D3D] bg-[#141B24] hover:border-[#00D4FF]/40 transition-colors"
                onClick={closeMenu}
                aria-label="Close navigation menu"
              >
                <X className="h-4 w-4 text-[#EEF2F7]" />
              </button>
            </div>

            {/* Nav links */}
            <div className="px-5 py-5 space-y-1">
              {[
                { href: `/${locale}`,               id: NAV_ITEM_IDS.HOME,        icon: House,      label: "Home" },
                { href: `/${locale}/explore`,        id: NAV_ITEM_IDS.EXPLORE,     icon: Compass,    label: t("navigation.explore") },
                { href: `/${locale}/marketplace`,    id: NAV_ITEM_IDS.MARKETPLACE, icon: ShoppingBag,label: t("navigation.marketplace") },
                { href: `/${locale}/artists`,        id: NAV_ITEM_IDS.ARTISTS,     icon: Users,      label: t("navigation.artists") },
                { href: `/${locale}/vault`,          id: NAV_ITEM_IDS.VAULT,       icon: Lock,       label: t("navigation.vault") },
                { href: `/${locale}/creator-dashboard/create-your-collection`, id: NAV_ITEM_IDS.CREATE, icon: PlusSquare, label: "Create" },
                { href: `/${locale}/creator-dashboard/collections`,            id: NAV_ITEM_IDS.COLLECTIONS, icon: Layers,  label: "Collections" },
                { href: `/${locale}/creator-dashboard/sales`,                  id: NAV_ITEM_IDS.ACTIVITY, icon: Activity, label: "Activity" },
              ].map(({ href, id, icon: Icon, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#8A9BB0] hover:text-white hover:bg-[#141B24] transition-colors"
                  onClick={e => { handleNavClick(e, id, NAV_PLACEMENTS.NAVBAR_MOBILE_DRAWER, href, "drawer_open"); closeMenu(); }}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />{label}
                </Link>
              ))}

              {isAuthenticated && (
                <>
                  <Link href={`/${locale}/creator-dashboard`} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#8A9BB0] hover:text-white hover:bg-[#141B24] transition-colors" onClick={closeMenu}>
                    <Layers className="h-4 w-4 flex-shrink-0" />{t("navigation.dashboard")}
                  </Link>
                  <Link href={`/${locale}/creator-dashboard/settings`} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#8A9BB0] hover:text-white hover:bg-[#141B24] transition-colors" onClick={closeMenu}>
                    <Settings className="h-4 w-4 flex-shrink-0" />Settings
                  </Link>
                </>
              )}
            </div>

            {/* Divider */}
            <div className="mx-5 border-t border-[#1E2D3D]" />

            {/* Mobile utilities */}
            <div className="px-5 py-4 space-y-4">
              <ModernSearchInput placeholder={t("navigation.search")} />
              <MobileLanguageSwitcher />
              {!loading && (
                isAuthenticated ? (
                  <Link
                    href={`/${locale}/creator-dashboard`}
                    className="flex items-center justify-center w-full rounded-lg px-5 py-3 bg-[#00D4FF] text-[#0D1117] font-semibold text-sm hover:bg-[#00A8CC] transition-colors"
                    onClick={closeMenu}
                  >
                    {t("navigation.dashboard")}
                  </Link>
                ) : (
                  <WalletConnector forceVisible fullWidth />
                )
              )}
            </div>
          </div>
        </aside>
      </div>
    </header>
  );
}
