"use client";

import { Button } from "@/components/ui/button";
import { Vault } from "@/components/Vault";
import { useTranslation } from "@/hooks/useTranslation";
import Link from "next/link";
import { useExperimentVariant } from "@/hooks/useExperiment";
import { useEffect, useRef } from "react";
import { telemetry } from "@/lib/telemetry";
import { sanitizeTelemetryPayload } from "@/lib/telemetry/sanitizer";
import { EVENT_NAMES } from "@/lib/telemetry/events";
import { Sparkles, ArrowRight, Shield, Zap, Globe } from "lucide-react";

export function MainHero() {
  const { t, locale } = useTranslation();
  const heroCTAAssignment = useExperimentVariant(
    "hero-cta-placement-2026-q2"
  );
  const exposureSentRef = useRef(false);
  const exposureSessionIdRef = useRef<string | null>(null);
  const exposureTimestampRef = useRef<number | null>(null);

  useEffect(() => {
    if (!heroCTAAssignment || exposureSentRef.current) return;
    const exposureSessionId = crypto.randomUUID();
    exposureSessionIdRef.current = exposureSessionId;
    exposureTimestampRef.current = Date.now();
    telemetry.track(
      EVENT_NAMES.experimentExposed,
      sanitizeTelemetryPayload({
        experiment_id: heroCTAAssignment.experiment_id,
        experiment_name: "Hero CTA Placement Optimization",
        variant_id: heroCTAAssignment.variant_id,
        variant_name: heroCTAAssignment.variant_name,
        variant_version: 1,
        surface: "landing_hero",
        placement_category: heroCTAAssignment.is_control ? "feature_hero" : "feature_hero",
        cta_label: "Explore Collections",
        assigned_at_timestamp_ms: heroCTAAssignment.assigned_at_timestamp_ms,
        is_control: heroCTAAssignment.is_control,
        target_user_segment: "all",
        rollout_percentage: 50,
        exposure_session_id: exposureSessionId,
        experiment_session_id: "",
      })
    );
    exposureSentRef.current = true;
  }, [heroCTAAssignment]);

  const handleRegisterClick = () => {
    if (!heroCTAAssignment || !exposureSessionIdRef.current || !exposureTimestampRef.current) return;
    telemetry.track(
      EVENT_NAMES.experimentInteraction,
      sanitizeTelemetryPayload({
        experiment_id: heroCTAAssignment.experiment_id,
        variant_id: heroCTAAssignment.variant_id,
        interaction_type: "click",
        interaction_timestamp_ms: Date.now(),
        time_to_interaction_ms: Date.now() - exposureTimestampRef.current,
        surface: "landing_hero",
        placement_category: heroCTAAssignment.is_control ? "feature_hero" : "feature_hero",
        is_control: heroCTAAssignment.is_control,
        exposure_session_id: exposureSessionIdRef.current,
        interaction_sequence: 1,
      })
    );
  };

  const features = [
    {
      icon: Globe,
      value: "100%",
      label: t("homepage.features.onChain"),
      desc: t("homepage.features.onChainDesc"),
    },
    {
      icon: Zap,
      value: t("homepage.features.stellar"),
      label: t("homepage.features.ecosystem"),
      desc: t("homepage.features.stellarDesc"),
    },
    {
      icon: Shield,
      value: t("homepage.features.secure"),
      label: t("homepage.features.storage"),
      desc: t("homepage.features.secureDesc"),
    },
  ];

  return (
    <div className="relative flex flex-col lg:flex-row gap-8 lg:gap-12 items-center py-8 sm:py-12 md:py-16 lg:py-20 px-4 sm:px-8 lg:px-0 mt-8 sm:mt-12 md:mt-16 overflow-hidden">
      {/* Ambient glow orbs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#00D4FF]/5 rounded-full blur-[120px] animate-lm-glow-pulse" aria-hidden="true" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#7B6FFF]/5 rounded-full blur-[120px] animate-lm-glow-pulse" aria-hidden="true" style={{ animationDelay: "1.5s" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-[#00D4FF]/3 to-[#7B6FFF]/3 rounded-full blur-[150px]" aria-hidden="true" />

      {/* Left Section */}
      <div className="relative w-full flex flex-col md:justify-center md:items-center lg:items-start lg:justify-start lg:w-1/2 space-y-6 md:space-y-8 pt-4 md:pt-0">
        {/* Premium badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#00D4FF]/10 to-[#7B6FFF]/10 border border-[#00D4FF]/20 text-xs font-medium text-[#00D4FF] lm-stagger-1">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Powered by Stellar · Soroban Smart Contracts</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight text-white font-display tracking-tight lm-stagger-2">
          {t("homepage.hero.titlePart1")}
          <br />
          <span className="text-4xl sm:text-5xl md:text-6xl xl:text-7xl lm-gradient-text block mt-1 mb-1">
            {t("homepage.hero.titlePart2")}
          </span>
          <span className="tracking-tight block mt-1 text-white/90">
            {t("homepage.hero.titlePart3")}
          </span>
        </h1>

        <p className="text-gray-400 text-base sm:text-lg max-w-lg leading-relaxed lm-stagger-3">
          {t("homepage.hero.subtitle")}
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-2 sm:pt-4 lm-stagger-4">
          <Link href={`/${locale}/auth/register`}>
            <Button
              variant="default"
              size="lg"
              className="rounded-full px-6 sm:px-8 text-sm sm:text-base font-semibold group relative overflow-hidden"
              onClick={handleRegisterClick}
            >
              <span className="relative z-10 flex items-center gap-2">
                {t("homepage.hero.cta")}
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
              <span className="absolute inset-0 bg-gradient-to-r from-[#00D4FF] to-[#7B6FFF] opacity-0 group-hover:opacity-100 transition-opacity duration-500" aria-hidden="true" />
            </Button>
          </Link>
          <Link href={`/${locale}/marketplace`}>
            <Button
              variant="outline"
              size="lg"
              className="relative rounded-full px-6 sm:px-8 text-sm sm:text-base font-semibold group overflow-hidden border-[#1E2D3D] hover:border-[#00D4FF]/40"
            >
              <span className="absolute inset-0 rounded-full bg-gradient-to-r from-[#00D4FF]/10 to-[#7B6FFF]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" aria-hidden="true" />
              <span className="relative z-10 flex items-center gap-2">
                {t("homepage.hero.learnMore")}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="transition-transform duration-300 group-hover:translate-x-1"
                  aria-hidden="true"
                >
                  <path
                    d="M3.33337 8H12.6667"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8 3.33331L12.6667 7.99998L8 12.6666"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </Button>
          </Link>
        </div>

        {/* Feature stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-6 sm:pt-8 max-w-lg lm-stagger-5">
          {features.map(({ icon: Icon, value, label, desc }, idx) => (
            <div
              key={idx}
              className="group relative bg-[#141B24]/60 p-3.5 sm:p-4 rounded-xl text-center backdrop-blur-md border border-[#1E2D3D]/60 hover:border-[#00D4FF]/20 shadow-lg hover:shadow-lm-glow-sm transition-all duration-300 overflow-hidden"
            >
              {/* Hover glow */}
              <div className="absolute -inset-px bg-gradient-to-br from-[#00D4FF]/10 to-[#7B6FFF]/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" aria-hidden="true" />
              
              <Icon className="h-5 w-5 mx-auto mb-2 text-[#00D4FF]/60 group-hover:text-[#00D4FF] transition-colors duration-300" />
              <div className="text-xl sm:text-2xl font-bold text-white mb-0.5 lm-gradient-text">
                {value}
              </div>
              <div className="text-xs sm:text-sm text-[#8A9BB0] font-medium">
                {label}
              </div>
              <p className="text-[10px] text-[#6B7A8D] mt-0.5">{desc}</p>
              
              {/* Top accent */}
              <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-[#00D4FF]/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" aria-hidden="true" />
            </div>
          ))}
        </div>
      </div>

      {/* Right Section */}
      <div className="w-full md:w-1/2 lg:flex hidden justify-center md:justify-end items-center mt-8 md:mt-0">
        <div className="relative max-w-xs sm:max-w-md md:max-w-lg lg:max-w-xl w-full md:w-[90%] lg:w-[85%] -mt-8 sm:-mt-12 md:-mt-16 lg:-mt-24 md:mr-4 lg:mr-8">
          <div className="relative h-[260px] sm:h-[340px] md:h-[400px] lg:h-[500px] flex items-center justify-center">
            {/* Decorative rings */}
            <div className="absolute w-[90%] h-[90%] border border-[#00D4FF]/10 rounded-full animate-lm-spin-slow" aria-hidden="true" />
            <div className="absolute w-[70%] h-[70%] border border-[#7B6FFF]/10 rounded-full animate-lm-spin-slow" aria-hidden="true" style={{ animationDirection: "reverse", animationDuration: "12s" }} />
            <Vault />
          </div>
        </div>
      </div>
    </div>
  );
}
