"use client";

import React from "react";
import Lottie from "lottie-react";
import animationData from "@/public/animations/Page Not Found 404 c3.json";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

const LottiePlayer = () => {
  const prefersReducedMotion = usePrefersReducedMotion();

  // Users who request reduced motion get a static frame instead of an
  // endlessly looping animation (WCAG 2.3.3).
  if (prefersReducedMotion) {
    return <Lottie animationData={animationData} loop={false} autoplay={false} />;
  }

  return <Lottie animationData={animationData} loop autoplay />;
};

export default LottiePlayer;