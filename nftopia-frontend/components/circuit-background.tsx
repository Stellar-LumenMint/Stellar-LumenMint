"use client";

import { useEffect, useRef } from "react";

/**
 * Stellar-LumenMint premium ambient background (v2.0).
 * Cosmic midnight field with luminous teal/violet particles,
 * orbital nodes, and subtle grid patterns.
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
      "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(0,212,255,0.08) 0%, transparent 60%), " +
      "radial-gradient(ellipse 60% 50% at 90% 90%, rgba(123,111,255,0.06) 0%, transparent 55%), " +
      "radial-gradient(ellipse 50% 40% at 10% 80%, rgba(255,107,157,0.03) 0%, transparent 50%), " +
      "#0D1117";
    container.appendChild(base);

    /* ── Subtle scan-line grid ───────────────────────── */
    const grid = document.createElement("div");
    grid.className = "absolute inset-0 opacity-[0.02]";
    grid.style.backgroundImage =
      "linear-gradient(rgba(0,212,255,0.4) 1px, transparent 1px)," +
      "linear-gradient(90deg, rgba(0,212,255,0.4) 1px, transparent 1px)";
    grid.style.backgroundSize = "60px 60px";
    container.appendChild(grid);

    /* ── Diagonal grid overlay ───────────────────────── */
    const diagGrid = document.createElement("div");
    diagGrid.className = "absolute inset-0 opacity-[0.015]";
    diagGrid.style.backgroundImage =
      "linear-gradient(45deg, rgba(123,111,255,0.3) 1px, transparent 1px)," +
      "linear-gradient(-45deg, rgba(123,111,255,0.3) 1px, transparent 1px)";
    diagGrid.style.backgroundSize = "80px 80px";
    container.appendChild(diagGrid);

    /* ── Particles ──────────────────────────────────── */
    const pContainer = document.createElement("div");
    pContainer.className = "absolute inset-0 pointer-events-none";

    const TEAL   = "rgba(0,212,255,";
    const VIOLET = "rgba(123,111,255,";
    const WHITE  = "rgba(238,242,247,";
    const PINK   = "rgba(255,107,157,";

    for (let i = 0; i < 80; i++) {
      const p = document.createElement("div");
      p.className = "absolute rounded-full";
      const size = 0.6 + Math.random() * 2.5;
      p.style.width  = `${size}px`;
      p.style.height = `${size}px`;

      const colors = [TEAL, VIOLET, WHITE, TEAL, PINK, VIOLET];
      const color = colors[i % colors.length];
      const opacity = (0.3 + Math.random() * 0.6).toFixed(2);
      p.style.backgroundColor = `${color}${opacity})`;
      p.style.boxShadow = `0 0 ${3 + Math.random() * 6}px ${color}0.4)`;

      p.style.left = `${Math.random() * w}px`;
      p.style.top  = `${Math.random() * h}px`;

      const dur  = 6 + Math.random() * 12;
      const dly  = Math.random() * -dur;
      const tx   = (Math.random() - 0.5) * 200;
      const ty   = 60 + Math.random() * 200;

      p.style.animation = `lm-particle-rise ${dur}s ${dly}s linear infinite`;
      p.style.setProperty("--tx", `${tx}px`);
      p.style.setProperty("--ty", `-${ty}px`);

      pContainer.appendChild(p);
    }
    container.appendChild(pContainer);

    /* ── Glowing orbital nodes ──────────────────────── */
    const nContainer = document.createElement("div");
    nContainer.className = "absolute inset-0 pointer-events-none";

    for (let i = 0; i < 20; i++) {
      const node = document.createElement("div");
      node.className = "absolute rounded-full";
      const size = 2 + Math.random() * 2;
      node.style.width  = `${size}px`;
      node.style.height = `${size}px`;
      
      const isTeal = i % 3 === 0;
      node.style.backgroundColor = isTeal ? "#00D4FF" : i % 3 === 1 ? "#7B6FFF" : "#FF6B9D";
      node.style.boxShadow = isTeal
        ? "0 0 12px rgba(0,212,255,0.8)"
        : i % 3 === 1
          ? "0 0 12px rgba(123,111,255,0.8)"
          : "0 0 12px rgba(255,107,157,0.8)";
      node.style.left = `${5 + Math.random() * 90}%`;
      node.style.top  = `${5 + Math.random() * 90}%`;
      node.style.animation = `lm-node-pulse ${2 + Math.random() * 3}s ${Math.random() * 3}s ease-in-out infinite alternate`;
      nContainer.appendChild(node);
    }
    container.appendChild(nContainer);

    /* ── Shooting star trails ───────────────────────── */
    const shootingStar = document.createElement("div");
    shootingStar.className = "absolute w-[100px] h-[1px]";
    shootingStar.style.background = "linear-gradient(to right, transparent, rgba(0,212,255,0.3), rgba(123,111,255,0.2), transparent)";
    shootingStar.style.top = `${Math.random() * 40}%`;
    shootingStar.style.right = "-100px";
    shootingStar.style.animation = `lm-shooting-star ${6 + Math.random() * 8}s ${Math.random() * 10}s linear infinite`;
    container.appendChild(shootingStar);

    /* ── Keyframes (injected once) ──────────────────── */
    const styleId = "lm-bg-keyframes-v2";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        @keyframes lm-particle-rise {
          0%   { transform: translate(0, 0) scale(1);   opacity: 0; }
          10%  { opacity: 1; }
          85%  { opacity: 0.5; }
          100% { transform: translate(var(--tx), var(--ty)) scale(0.2); opacity: 0; }
        }
        @keyframes lm-node-pulse {
          from { transform: scale(1);   opacity: 0.3; }
          to   { transform: scale(2.5); opacity: 0.9; }
        }
        @keyframes lm-shooting-star {
          0%   { transform: translateX(0) translateY(0) rotate(-20deg); opacity: 0; }
          10%  { opacity: 1; }
          40%  { transform: translateX(-1200px) translateY(200px) rotate(-20deg); opacity: 1; }
          41%  { opacity: 0; }
          100% { opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) existingStyle.remove();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="circuit-background fixed inset-0 z-[-1] overflow-hidden"
      aria-hidden="true"
    />
  );
}
