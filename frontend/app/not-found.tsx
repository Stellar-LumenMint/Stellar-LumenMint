"use client";

import LottiePlayer from "@/components/animations/LottiePlayer";
import Link from "next/link";
import React from "react";
import { Sparkles, Home } from "lucide-react";
import { useMobile } from "@/hooks";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import Footer from "@/components/Footer";
import { CircuitBackground } from "@/components/circuit-background";
import { StellarWalletProvider } from "@/components/StellarWalletProvider";
import { StoreProvider } from "@/lib/stores/store-provider";
import { Toast } from "@/components/ui/toast";
import { useTranslation } from "@/hooks/useTranslation";

const NotFound = () => {
  const isMobile = useMobile();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[#0D1117] text-white relative contain-layout">
      <CircuitBackground />
      <StoreProvider>
        <StellarWalletProvider>
          <main className="relative z-10 pt-16 md:pt-20">
            <Navbar />
            <div className="container-responsive py-4 md:py-8">
              <div
                className={`flex items-center justify-center min-h-[60vh] w-full px-4 py-12 ${
                  isMobile ? "flex-col space-y-8" : "flex-row space-x-8"
                }`}
              >
                <div
                  className={`flex flex-col ${
                    isMobile
                      ? "items-center text-center space-y-4"
                      : "space-y-4 max-w-md items-start text-left"
                  }`}
                >
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#00D4FF]/10 to-[#7B6FFF]/10 border border-[#00D4FF]/20 text-xs font-medium text-[#00D4FF] w-fit">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>404 Error</span>
                  </div>
                  <h1
                    className={
                      isMobile
                        ? "text-5xl font-bold text-white tracking-tight"
                        : "text-7xl font-bold text-white tracking-tight"
                    }
                  >
                    {t("notFound.title")}
                  </h1>
                  <p
                    className={`${
                      isMobile ? "text-lg" : "text-xl"
                    } text-[#8A9BB0] leading-relaxed`}
                  >
                    {t("notFound.message")}
                  </p>
                  <p
                    className={`${
                      isMobile ? "text-sm" : "text-base"
                    } text-[#6B7A8D] font-mono`}
                  >
                    {t("notFound.errorCode")}
                  </p>
                  <Link href="/en">
                    <Button
                      size={isMobile ? "sm" : "lg"}
                      variant="cosmic"
                      className="rounded-xl mt-2"
                    >
                      <Home className="h-4 w-4" />
                      {t("notFound.backToHome")}
                    </Button>
                  </Link>
                </div>
                <div
                  className={
                    isMobile ? "w-full max-w-2xl mt-8" : "w-[540px] ml-8"
                  }
                >
                  <LottiePlayer />
                </div>
              </div>
            </div>
            <Footer />
          </main>
          <Toast />
        </StellarWalletProvider>
      </StoreProvider>
    </div>
  );
};

export default NotFound;
