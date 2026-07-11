"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { OptimizedImage } from "./image";
import { Button } from "@/components/ui/button";
import { Clock, ChevronRight, ChevronLeft, Zap } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import ErrorBoundary from "./ErrorBoundary";

type AuctionItem = {
  id: string;
  name: string;
  creator: string;
  price: string;
  timeLeft: string;
  bidCount: number;
  isLive: boolean;
  accent: string;  // teal or violet
};

function LiveAuctionsContent() {
  const { t } = useTranslation();

  const auctionItems: AuctionItem[] = [
    { id:"1", name:"Yonder Contemplation",      creator:"KittenSoul",      price:"4.89 XLM", timeLeft:"04:12:41", bidCount:12, isLive:true, accent:"teal" },
    { id:"2", name:"Tranquillizer Awakening",   creator:"Nova Nexus",      price:"4.89 XLM", timeLeft:"02:34:56", bidCount:8,  isLive:true, accent:"violet" },
    { id:"3", name:"Loving Vessel",             creator:"Cosmic Conjurer", price:"4.89 XLM", timeLeft:"01:23:45", bidCount:15, isLive:true, accent:"teal" },
    { id:"4", name:"Tame Beast",                creator:"Zen Voyager",     price:"4.89 XLM", timeLeft:"00:59:59", bidCount:7,  isLive:true, accent:"violet" },
    { id:"5", name:"Cosmic Dreamer",            creator:"Astral Artist",   price:"5.12 XLM", timeLeft:"03:45:22", bidCount:9,  isLive:true, accent:"teal" },
    { id:"6", name:"Digital Horizon",           creator:"Pixel Prophet",   price:"3.75 XLM", timeLeft:"05:30:15", bidCount:11, isLive:true, accent:"violet" },
    { id:"7", name:"Ethereal Whisper",          creator:"Mystic Maker",    price:"6.20 XLM", timeLeft:"01:15:33", bidCount:14, isLive:true, accent:"teal" },
    { id:"8", name:"Neon Nostalgia",            creator:"Retro Renderer",  price:"4.50 XLM", timeLeft:"02:20:10", bidCount:6,  isLive:true, accent:"violet" },
  ];

  const itemsPerPage = 4;
  const totalPages = Math.ceil(auctionItems.length / itemsPerPage);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setCurrentPage(p => (p + 1) % totalPages), 6000);
    return () => clearInterval(interval);
  }, [totalPages]);

  const currentItems = auctionItems.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);

  return (
    <section className="py-16 relative" aria-labelledby="live-auctions-heading">
      {/* ── Section header ────────────────────────────── */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#00D4FF]/10 border border-[#00D4FF]/25">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00D4FF] animate-pulse" />
            <span className="text-[#00D4FF] text-xs font-semibold uppercase tracking-widest">Live</span>
          </div>
          <h2 id="live-auctions-heading" className="text-2xl font-bold text-white">
            {t("liveAuctions.title")}
          </h2>
        </div>
        <Link href="/marketplace/auctions">
          <Button variant="link" className="text-[#8A9BB0] hover:text-[#00D4FF] flex items-center gap-1 text-xs transition-colors">
            {t("liveAuctions.exploreMore")}
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      {/* ── Carousel nav ──────────────────────────────── */}
      <button
        onClick={() => setCurrentPage(p => (p - 1 + totalPages) % totalPages)}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-[#141B24] border border-[#1E2D3D] hover:border-[#00D4FF]/40 transition-colors -ml-4 lg:ml-0"
        aria-label={t("liveAuctions.previousPage")}
      >
        <ChevronLeft className="h-4 w-4 text-[#EEF2F7]" />
      </button>
      <button
        onClick={() => setCurrentPage(p => (p + 1) % totalPages)}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-[#141B24] border border-[#1E2D3D] hover:border-[#00D4FF]/40 transition-colors -mr-4 lg:mr-0"
        aria-label={t("liveAuctions.nextPage")}
      >
        <ChevronRight className="h-4 w-4 text-[#EEF2F7]" />
      </button>

      {/* ── Auction cards ─────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {currentItems.map((item) => {
          const isTeal = item.accent === "teal";
          const accentColor  = isTeal ? "#00D4FF" : "#7B6FFF";
          const glowClass    = isTeal ? "hover:shadow-[0_4px_24px_rgba(0,212,255,0.12)]" : "hover:shadow-[0_4px_24px_rgba(123,111,255,0.12)]";
          const bgGlow       = isTeal ? "rgba(0,212,255,0.06)" : "rgba(123,111,255,0.06)";

          return (
            <div
              key={item.id}
              className={`bg-[#141B24] rounded-2xl overflow-hidden border border-[#1E2D3D] transition-all duration-300 hover:-translate-y-1 ${glowClass} group`}
              style={{ borderColor: "rgba(30,45,61,1)" }}
            >
              {/* Image area */}
              <div className="relative h-[200px] overflow-hidden" style={{ background: bgGlow }}>
                <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-[#0D1117]/80 backdrop-blur rounded-full px-2.5 py-1 text-xs font-medium">
                  <Clock className="h-3 w-3 text-red-400" />
                  <span className="text-[#EEF2F7]">{item.timeLeft}</span>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <OptimizedImage
                    src="/stellar-lumenmint-mark.svg"
                    alt={item.name}
                    width={90}
                    height={90}
                    className="opacity-70 group-hover:opacity-90 transition-opacity"
                    fallbackSrc="/images/fallbacks/nft-fallback.svg"
                  />
                </div>
                {/* Bottom gradient overlay */}
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#141B24] to-transparent" />
              </div>

              {/* Card body */}
              <div className="p-4 space-y-3">
                <h3 className="font-semibold text-[#EEF2F7] text-base leading-tight">{item.name}</h3>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-[#0D1117]"
                      style={{ background: accentColor }}>
                      {item.creator.slice(0, 1)}
                    </div>
                    <span className="text-sm text-[#8A9BB0]">{item.creator}</span>
                  </div>
                  <span className="text-sm font-semibold" style={{ color: accentColor }}>
                    {item.price}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-[#1E2D3D]">
                  <div className="flex items-center gap-1.5">
                    <Zap className="h-3 w-3 text-[#8A9BB0]" />
                    <span className="text-xs text-[#8A9BB0]">{t("liveAuctions.currentBid")}</span>
                    <span className="text-xs font-semibold text-[#EEF2F7]">{item.bidCount}</span>
                  </div>
                  <Link href={`/marketplace/auction/${item.id}`}>
                    <Button
                      size="sm"
                      className="rounded-full px-4 py-1 text-xs font-semibold text-[#0D1117] transition-opacity hover:opacity-90"
                      style={{ background: accentColor }}
                    >
                      {t("liveAuctions.bid")}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Page dots ─────────────────────────────────── */}
      <div className="flex justify-center mt-8 gap-2" role="tablist" aria-label="Auction pages">
        {Array.from({ length: totalPages }).map((_, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={currentPage === i}
            onClick={() => setCurrentPage(i)}
            className={`h-1.5 rounded-full transition-all ${
              currentPage === i ? "w-6 bg-[#00D4FF]" : "w-1.5 bg-[#1E2D3D]"
            }`}
            aria-label={t("liveAuctions.goToPage", { page: i + 1 })}
          />
        ))}
      </div>
    </section>
  );
}

export function LiveAuctions() {
  return (
    <ErrorBoundary componentName="LiveAuctions" showRetry showHome={false} showReport>
      <LiveAuctionsContent />
    </ErrorBoundary>
  );
}

export default LiveAuctions;
