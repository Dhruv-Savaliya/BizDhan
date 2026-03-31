"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useState } from "react";

export function Background() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 1000], [0, 200]);
  const y2 = useTransform(scrollY, [0, 1000], [0, -200]);
  const opacity = useTransform(scrollY, [0, 500], [0.8, 0]);

  if (!mounted) return <div className="absolute inset-0 z-0 bg-background" />;

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-slate-50 dark:bg-[#0a0a0e]">
      {/* 3D Perspective Grid */}
      <div 
        className="absolute inset-x-0 bottom-0 h-[60vh] opacity-30"
        style={{
          perspective: "1000px",
          transformStyle: "preserve-3d",
        }}
      >
        <div 
          className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)]" 
          style={{
             backgroundSize: "60px 60px",
             transform: "rotateX(75deg)",
             transformOrigin: "bottom center",
          }}
        />
      </div>

      <motion.div style={{ opacity }} className="absolute inset-0 pointer-events-none">
        {/* Deep Violet Core Glow */}
        <motion.div 
          style={{ y: y1 }}
          className="absolute top-[-10%] left-[20%] w-[800px] h-[800px] bg-violet-600/20 rounded-full blur-[150px] mix-blend-screen"
        />

        {/* Mint Teal Accent Glow */}
        <motion.div 
          style={{ y: y2 }}
          className="absolute top-[20%] right-[10%] w-[600px] h-[600px] bg-teal-500/20 rounded-full blur-[150px] mix-blend-screen"
        />
        
        {/* Core center highlight */}
        <div className="absolute top-[30%] left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-primary/15 rounded-full blur-[120px] mix-blend-screen" />
      </motion.div>

      {/* Noise overlay for texture */}
      <div 
        className="absolute inset-0 opacity-[0.04] dark:opacity-[0.015] pointer-events-none mix-blend-overlay"
        style={{ backgroundImage: "url('https://grainy-gradients.vercel.app/noise.svg')" }}
      />
    </div>
  );
}