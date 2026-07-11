"use client";
import Link from "next/link";
import { OptimizedImage } from "./image";
import { Github, Twitter, Instagram, Mail, Youtube, Zap } from "lucide-react";
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

  return (
    <footer className="bg-[#0D1117] border-t border-[#1E2D3D] text-white">
      {/* Top accent line */}
      <div className="h-[1px] bg-gradient-to-r from-transparent via-[#00D4FF]/30 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* ── Main grid ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">

          {/* Brand block */}
          <div className="flex flex-col gap-4">
            <Link href="/" className="flex items-center">
              <OptimizedImage
                src="/stellar-lumenmint-logo.svg"
                alt="Stellar-LumenMint"
                width={160}
                height={36}
                className="h-8 w-auto"
                fallbackSrc="/images/fallbacks/collection-fallback.svg"
                priority
              />
            </Link>
            <p className="text-sm text-[#8A9BB0] leading-relaxed max-w-xs">
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
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#141B24] border border-[#1E2D3D] text-[#8A9BB0] hover:text-[#00D4FF] hover:border-[#00D4FF]/40 transition-colors"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Platform links */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-widest">
              Platform
            </h3>
            <nav className="flex flex-col gap-2" aria-label="Platform links">
              {quickLinks.map(({ href, label }) => (
                <Link key={href} href={href}
                  className="text-sm text-[#8A9BB0] hover:text-[#00D4FF] transition-colors">
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Support links */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-widest">
              {t("footer.support")}
            </h3>
            <nav className="flex flex-col gap-2" aria-label="Support links">
              {supportLinks.map(({ href, label }) => (
                <Link key={href} href={href}
                  className="text-sm text-[#8A9BB0] hover:text-[#00D4FF] transition-colors">
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Network status / CTA block */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-widest">
              Network
            </h3>
            <div className="flex items-center gap-2 text-sm text-[#8A9BB0]">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Stellar Mainnet · Live
            </div>
            <div className="flex items-center gap-2 text-sm text-[#8A9BB0]">
              <span className="h-2 w-2 rounded-full bg-[#00D4FF]" />
              Soroban Smart Contracts
            </div>
            <Link
              href={`/${locale}/creator-dashboard`}
              className="mt-2 inline-flex items-center gap-2 rounded-lg bg-[#00D4FF] px-4 py-2.5 text-[#0D1117] text-sm font-semibold hover:bg-[#00A8CC] transition-colors w-fit"
            >
              <Zap className="h-4 w-4" />
              Start Creating
            </Link>
          </div>
        </div>

        {/* ── Bottom bar ────────────────────────────────────── */}
        <div className="border-t border-[#1E2D3D] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[#8A9BB0] text-center sm:text-left">
            © {year} Stellar-LumenMint. All rights reserved.
          </p>
          <div className="flex items-center gap-1 text-xs text-[#8A9BB0]">
            <span>Built on</span>
            <span className="text-[#00D4FF] font-medium">Stellar</span>
            <span>·</span>
            <span className="text-[#7B6FFF] font-medium">Soroban</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
