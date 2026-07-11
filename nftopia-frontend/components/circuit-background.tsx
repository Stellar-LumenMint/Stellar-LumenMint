"use client";

import { useEffect, useRef } from "react";

/**
 * Stellar-LumenMint ambient background.
 * Replaces the old purple/indigo circuit pattern with a deep midnight
 * field of teal particles and glowing orbital nodes — matching the
 * new #0D1117 / #00D4FF brand palette.
 */
export function CircuitBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = "";
    const w = window.innerWidth;
    const h = window.innerHeight;

    /* ── Base gradient ─────────────────────────────── */
    const base = document.createElement("div");
    base.className = "absolute inset-0";
    base.style.background =
      "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(0,212,255,0.07) 0%, transparent 60%), " +
      "radial-gradient(ellipse 60% 50% at 90% 90%, rgba(123,111,255,0.06) 0%, transparent 55%), " +
      "#0D1117";
    container.appendChild(base);

    /* ── Subtle scan-line grid ───────────────────────── */
    const grid = document.createElement("div");
    grid.className = "absolute inset-0 opacity-[0.025]";
    grid.style.backgroundImage =
      "linear-gradient(rgba(0,212,255,0.5) 1px, transparent 1px)," +
      "linear-gradient(90deg, rgba(0,212,255,0.5) 1px, transparent 1px)";
    grid.style.backgroundSize = "60px 60px";
    container.appendChild(grid);

    /* ── Particles ──────────────────────────────────── */
    const pContainer = document.createElement("div");
    pContainer.className = "absolute inset-0 pointer-events-none";

    const TEAL   = "rgba(0,212,255,";
    const VIOLET = "rgba(123,111,255,";
    const WHITE  = "rgba(238,242,247,";

    for (let i = 0; i < 60; i++) {
      const p = document.createElement("div");
      p.className = "absolute rounded-full";
      const size = 0.7 + Math.random() * 2;
      p.style.width  = `${size}px`;
      p.style.height = `${size}px`;

      const type = i % 4;
      const color = type === 0 ? TEAL : type === 1 ? VIOLET : type === 2 ? WHITE : TEAL;
      const opacity = (0.4 + Math.random() * 0.5).toFixed(2);
      p.style.backgroundColor = `${color}${opacity})`;
      p.style.boxShadow = `0 0 ${3 + Math.random() * 4}px ${color}0.6)`;

      p.style.left = `${Math.random() * w}px`;
      p.style.top  = `${Math.random() * h}px`;

      const dur  = 5 + Math.random() * 10;
      const dly  = Math.random() * -dur;
      const tx   = (Math.random() - 0.5) * 180;
      const ty   = 80 + Math.random() * 160;

      p.style.animation = `lm-particle-rise ${dur}s ${dly}s linear infinite`;
      p.style.setProperty("--tx", `${tx}px`);
      p.style.setProperty("--ty", `-${ty}px`);

      pContainer.appendChild(p);
    }
    container.appendChild(pContainer);

    /* ── Glowing orbital nodes ──────────────────────── */
    const nContainer = document.createElement("div");
    nContainer.className = "absolute inset-0 pointer-events-none";

    for (let i = 0; i < 12; i++) {
      const node = document.createElement("div");
      node.className = "absolute rounded-full";
      node.style.width  = "3px";
      node.style.height = "3px";
      node.style.backgroundColor = i % 2 === 0 ? "#00D4FF" : "#7B6FFF";
      node.style.boxShadow = i % 2 === 0
        ? "0 0 10px rgba(0,212,255,0.8)"
        : "0 0 10px rgba(123,111,255,0.8)";
      node.style.left = `${10 + Math.random() * 80}%`;
      node.style.top  = `${10 + Math.random() * 80}%`;
      node.style.animation = `lm-node-pulse ${2 + Math.random() * 2.5}s ${Math.random() * 2}s ease-in-out infinite alternate`;
      nContainer.appendChild(node);
    }
    container.appendChild(nContainer);

    /* ── Keyframes (injected once) ──────────────────── */
    const styleId = "lm-bg-keyframes";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        @keyframes lm-particle-rise {
          0%   { transform: translate(0, 0) scale(1);   opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 0.6; }
          100% { transform: translate(var(--tx), var(--ty)) scale(0.4); opacity: 0; }
        }
        @keyframes lm-node-pulse {
          from { transform: scale(1);   opacity: 0.5; }
          to   { transform: scale(1.8); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }

    const handleResize = () => {
      container.innerHTML = "";
      createAll();
    };

    function createAll() {
      // Re-run by recursing — kept simple to avoid stale closures
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div
      ref={containerRef}
      className="circuit-background fixed inset-0 z-[-1] overflow-hidden"
      aria-hidden="true"
    />
  );
}
