"use client";
import Link from "next/link";
import { OptimizedImage } from "./image";
import { Github, Twitter, Instagram, Mail, Youtube, Zap, Sparkles, Globe, ArrowUpRight } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

const Footer = () => {
  const { t, locale } = useTranslation();
  const year = new Date().getFullYear();

  const quickLinks = [
    { href: `/${locale}/marketplace`,  label: t("navigation.marketplace") },
    { href: `/${locale}/explore`,      label: t("navigation.explore") },
    { href: `/${locale}/artists`,      label: t("navigation.artists") },
    { href: `/${locale}/vault`,        label: t("navigation.vault") },
  ];

  const resources = [
    { href: "/docs",           label: "Documentation" },
    { href: "/api",            label: "API Reference" },
    { href: "/blog",           label: "Blog" },
    { href: "/status",         label: "Network Status" },
  ];

  const supportLinks = [
    { href: "/contact",        label: t("footer.contactUs") },
    { href: "/help",           label: t("footer.helpCenter") },
    { href: "/privacy-policy", label: t("footer.privacyPolicy") },
    { href: "/terms-of-service", label: t("footer.termsOfService") },
  ];

  const socials = [
    { href: "https://twitter.com",   icon: Twitter,   label: "Twitter / X" },
    { href: "https://github.com",    icon: Github,    label: "GitHub" },
    { href: "https://instagram.com", icon: Instagram, label: "Instagram" },
    { href: "https://youtube.com",   icon: Youtube,   label: "YouTube" },
    { href: "mailto:hello@stellar-lumenmint.io", icon: Mail, label: "Email" },
  ];

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="relative bg-[#0D1117] border-t border-[#1E2D3D] text-white overflow-hidden">
      {/* Premium background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A1628]/50 to-transparent pointer-events-none" aria-hidden="true" />
      
      {/* Top accent line */}
      <div className="h-[1px] bg-gradient-to-r from-transparent via-[#00D4FF]/30 to-[#7B6FFF]/30 to-transparent" />

      {/* Scroll to top */}
      <button
        onClick={scrollToTop}
        className="absolute right-6 -top-3 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#00D4FF]/20 to-[#7B6FFF]/20 border border-[#00D4FF]/30 text-[#00D4FF] hover:from-[#00D4FF]/30 hover:to-[#7B6FFF]/30 transition-all duration-300 hover:scale-110"
        aria-label="Scroll to top"
      >
        <ArrowUpRight className="h-3 w-3" />
      </button>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* ── Main grid ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">

          {/* Brand block - spans 2 cols */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            <Link href="/" className="flex items-center group">
              <OptimizedImage
                src="/stellar-lumenmint-logo.svg"
                alt="Stellar-LumenMint"
                width={160}
                height={36}
                className="h-8 w-auto transition-transform duration-300 group-hover:scale-[1.02]"
                fallbackSrc="/images/fallbacks/collection-fallback.svg"
                priority
              />
            </Link>
            <p className="text-sm text-[#8A9BB0] leading-relaxed max-w-sm">
              {t("footer.description")}
            </p>
            
            {/* Social icons */}
            <div className="flex items-center gap-2 flex-wrap mt-1">
              {socials.map(({ href, icon: Icon, label }) => (
                <a
                  key={label}
                  href={href}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#141B24] border border-[#1E2D3D] text-[#8A9BB0] hover:text-[#00D4FF] hover:border-[#00D4FF]/40 hover:bg-[#1C2433] transition-all duration-300"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>

            {/* Network badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-400/5 border border-emerald-400/10 w-fit">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-400 font-medium">All Systems Operational</span>
            </div>
          </div>

          {/* Platform links */}
          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-semibold text-white/60 uppercase tracking-widest">
              Platform
            </h3>
            <nav className="flex flex-col gap-2.5" aria-label="Platform links">
              {quickLinks.map(({ href, label }) => (
                <Link key={href} href={href}
                  className="text-sm text-[#8A9BB0] hover:text-white transition-colors duration-200 w-fit">
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Resources links */}
          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-semibold text-white/60 uppercase tracking-widest">
              Resources
            </h3>
            <nav className="flex flex-col gap-2.5" aria-label="Resources links">
              {resources.map(({ href, label }) => (
                <Link key={href} href={href}
                  className="text-sm text-[#8A9BB0] hover:text-white transition-colors duration-200 w-fit">
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Support links */}
          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-semibold text-white/60 uppercase tracking-widest">
              {t("footer.support")}
            </h3>
            <nav className="flex flex-col gap-2.5" aria-label="Support links">
              {supportLinks.map(({ href, label }) => (
                <Link key={href} href={href}
                  className="text-sm text-[#8A9BB0] hover:text-white transition-colors duration-200 w-fit">
                  {label}
                </Link>
              ))}
            </nav>

            {/* CTA */}
            <Link
              href={`/${locale}/creator-dashboard`}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#00D4FF] to-[#00A8CC] px-4 py-2.5 text-[#0D1117] text-sm font-semibold hover:from-[#00A8CC] hover:to-[#0099BB] transition-all duration-300 w-fit shadow-lg shadow-[#00D4FF]/20"
            >
              <Zap className="h-4 w-4" />
              Start Creating
            </Link>
          </div>
        </div>

        {/* ── Bottom bar ────────────────────────────────────── */}
        <div className="border-t border-[#1E2D3D]/60 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-xs text-[#8A9BB0] text-center sm:text-left">
            <p>
              © {year} Stellar-LumenMint. All rights reserved.
            </p>
            <span className="hidden sm:inline text-[#1E2D3D]">·</span>
            <div className="flex items-center gap-1">
              <span>Built on</span>
              <span className="text-[#00D4FF] font-medium">Stellar</span>
              <span className="text-[#6B7A8D]">·</span>
              <span className="text-[#7B6FFF] font-medium">Soroban</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-[#6B7A8D]">
            <Link href="/privacy-policy" className="hover:text-[#8A9BB0] transition-colors">Privacy</Link>
            <Link href="/terms-of-service" className="hover:text-[#8A9BB0] transition-colors">Terms</Link>
            <Link href="/cookies" className="hover:text-[#8A9BB0] transition-colors">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
