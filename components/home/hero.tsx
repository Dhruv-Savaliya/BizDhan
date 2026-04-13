"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { motion, useScroll, useTransform, useSpring, useMotionValue, useMotionTemplate } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { HERO_CONTENT } from "@/constants/home/hero-constants";
import { ArrowRight, Sparkles, Plus, TrendingUp, PieChart, ShieldCheck } from "lucide-react";
import type { HomeMagneticButtonProps } from "@/types/home";

const ease = [0.16, 1, 0.3, 1] as const;

function MagneticButton({ children, className, variant, size, asChild, href }: HomeMagneticButtonProps) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 150, damping: 15 });
  const springY = useSpring(y, { stiffness: 150, damping: 15 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const { left, top, width, height } = btnRef.current?.getBoundingClientRect() || { left: 0, top: 0, width: 0, height: 0 };
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);
    x.set(middleX * 0.3);
    y.set(middleY * 0.3);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const Component = asChild ? motion.div : Button;

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY }}
    >
      <Button
        ref={btnRef}
        variant={variant}
        size={size}
        className={className}
        asChild={asChild}
      >
        {asChild ? <Link href={href ?? "#"}>{children}</Link> : children}
      </Button>
    </motion.div>
  );
}

export function Hero() {
  const containerRef = useRef<HTMLElement>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);
  
  // Mouse tracking for 3D dashboard
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotX = useSpring(useMotionValue(0), { stiffness: 100, damping: 30 });
  const rotY = useSpring(useMotionValue(0), { stiffness: 100, damping: 30 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    const x = (clientX - innerWidth / 2) / (innerWidth / 2);
    const y = (clientY - innerHeight / 2) / (innerHeight / 2);
    
    rotX.set(y * -15); // Rotate -15 to 15
    rotY.set(x * 15);
  };

  // Scroll Parallax
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const smoothScrollY = useSpring(scrollYProgress, { stiffness: 100, damping: 20 });
  const dashboardRotateBaseX = useTransform(smoothScrollY, [0, 0.4], [25, 0]);
  const dashboardScale = useTransform(smoothScrollY, [0, 0.4], [0.9, 1]);
  const dashboardY = useTransform(smoothScrollY, [0, 0.4], [0, -100]);
  
  // Combine scroll rotation with mouse rotation
  const finalRotateX = useTransform(
    [dashboardRotateBaseX, rotX],
    ([base, mouse]) => (base as number) + (mouse as number)
  );

  // Floating Widgets Parallax
  const widget1Y = useTransform(smoothScrollY, [0, 1], [0, -300]);
  const widget2Y = useTransform(smoothScrollY, [0, 1], [0, -400]);
  const widget3Y = useTransform(smoothScrollY, [0, 1], [0, -200]);

  return (
    <section
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative min-h-[160vh] flex flex-col items-center pt-32 pb-60 overflow-hidden bg-background selection:bg-primary/30"
    >
      {/* Dynamic Mesh Gradient Background */}
      <div className="absolute inset-x-0 top-0 h-[1000px] pointer-events-none -z-10 translate-y-[-20%]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,color-mix(in_srgb,var(--primary)_15%,transparent),transparent_70%)]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-full bg-[conic-gradient(from_0deg_at_50%_0%,rgba(45,212,191,0.08)_0deg,rgba(139,92,246,0.08)_120deg,rgba(45,212,191,0.08)_360deg)] blur-[100px] animate-[spin_20s_linear_infinite]" />
        
        {/* Particle Overlay */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay dark:opacity-[0.05]" />
        <div className="absolute inset-0 bg-[linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_20%,transparent_100%)] opacity-20 dark:opacity-10" />
      </div>

      <div className="container relative z-10 mx-auto px-4 sm:px-6 w-full max-w-7xl flex flex-col items-center text-center">
        {/* Animated Pill Badge */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease }}
          className="mb-10"
        >
          <div className="relative inline-flex overflow-hidden rounded-full p-[1.5px] group cursor-default">
            <span className="absolute inset-[-1000%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,rgba(45,212,191,0.2)_0%,rgba(139,92,246,0.8)_50%,rgba(45,212,191,0.2)_100%)]" />
            <div className="inline-flex items-center gap-2 h-full w-full rounded-full bg-background/90 px-6 py-2.5 text-sm font-bold text-foreground backdrop-blur-3xl ring-1 ring-white/10 shadow-2xl">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
                Experience the future of finance
              </span>
            </div>
          </div>
        </motion.div>

        {/* Shimmering Headline */}
        <motion.h1
          className="text-6xl md:text-8xl lg:text-9xl font-black tracking-[-0.05em] mb-8 max-w-[1200px] leading-[0.95]"
          initial={{ opacity: 0, y: 50, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 1.2, ease, delay: 0.2 }}
        >
          <span className="block text-foreground mb-4">
            Total control.
          </span>
          <span className="relative inline-block text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary/80 to-accent bg-[length:300%_100%] animate-[shimmer_8s_infinite_linear] dark:via-white">
            Pure growth.
            <motion.div 
              className="absolute -bottom-2 left-0 right-0 h-[6px] bg-primary/20 blur-xl"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 1, duration: 1.5, ease }}
            />
          </span>
        </motion.h1>

        {/* Sharp description */}
        <motion.p
          className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl font-medium tracking-tight leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
        >
          {HERO_CONTENT.description}
        </motion.p>

        {/* Magnetic CTAs */}
        <motion.div
          className="flex flex-col sm:flex-row gap-6 mb-32 z-30"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <MagneticButton
            size="lg"
            href={HERO_CONTENT.ctas.primary.href}
            asChild
            className="group bg-primary hover:bg-primary/90 text-primary-foreground text-xl h-16 px-10 font-black rounded-2xl shadow-[0_20px_50px_rgba(45,212,191,0.3)] transition-all duration-300"
          >
            {HERO_CONTENT.ctas.primary.label}
            <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-2 transition-transform" />
          </MagneticButton>
          
          <MagneticButton
            size="lg"
            variant="outline"
            href={HERO_CONTENT.ctas.secondary.href}
            asChild
            className="border-border dark:border-white/10 bg-background/5 dark:bg-white/5 backdrop-blur-xl text-foreground hover:bg-muted dark:hover:bg-white/10 text-xl h-16 px-10 font-black rounded-2xl transition-all duration-300"
          >
            {HERO_CONTENT.ctas.secondary.label}
          </MagneticButton>
        </motion.div>

        {/* Centerpiece 3D Interactive Mockup */}
        <div className="relative w-full max-w-[1300px] mt-10 perspective-[3000px] z-10">
          
          <motion.div
            ref={dashboardRef}
            style={{ 
              rotateX: finalRotateX, 
              rotateY: rotY,
              scale: dashboardScale, 
              y: dashboardY,
              transformStyle: "preserve-3d",
            }}
            className="relative w-full aspect-[16/10] rounded-[2.5rem] p-4 bg-gradient-to-br from-background/30 to-transparent backdrop-blur-3xl border border-border dark:border-white/10 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.1)] dark:shadow-[0_50px_100px_-20px_rgba(45,212,191,0.2)] overflow-hidden"
          >
            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-accent/5 opacity-50 z-20 pointer-events-none" />
            
            {/* Mock Dashboard UI */}
            <div className="relative z-10 w-full h-full rounded-[2rem] bg-card dark:bg-[#050508]/80 border border-border dark:border-white/5 overflow-hidden flex flex-col">
              {/* Header */}
              <div className="h-16 border-b border-border dark:border-white/5 bg-muted/30 dark:bg-white/[0.02] flex items-center px-8 justify-between">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="px-4 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[10px] font-mono text-muted-foreground tracking-widest uppercase">
                  HTTPS://BIZDHAN.IO/REALTIME-TRACKER
                </div>
                <div className="w-8 h-8 rounded-full bg-primary/20" />
              </div>

              {/* Main Area */}
              <div className="flex-1 p-8 grid grid-cols-12 gap-6">
                <div className="col-span-3 space-y-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className={`h-12 rounded-xl border border-white/5 ${i === 0 ? 'bg-primary/20' : 'bg-white/5'}`} />
                  ))}
                </div>
                <div className="col-span-9 space-y-6">
                  <div className="grid grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-32 rounded-2xl bg-muted/50 dark:bg-white/[0.03] border border-border dark:border-white/5 p-5">
                         <div className="w-10 h-2 bg-foreground/10 dark:bg-white/10 rounded mb-4" />
                         <div className="w-20 h-6 bg-foreground/20 dark:bg-white/20 rounded" />
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 min-h-[250px] rounded-2xl bg-white/[0.02] border border-white/5 p-6 flex items-end justify-between">
                    {[40, 70, 45, 90, 65, 80, 50, 100, 75, 85, 60, 95].map((h, i) => (
                      <motion.div 
                        key={i} 
                        initial={{ height: 0 }}
                        whileInView={{ height: `${h}%` }}
                        transition={{ delay: i * 0.05, duration: 1, ease: "circOut" }}
                        className="w-[6%] bg-gradient-to-t from-primary to-accent rounded-t-lg shadow-[0_0_20px_rgba(45,212,191,0.3)]" 
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* 3D Floating Widgets */}
          <motion.div
            style={{ y: widget1Y, translateZ: 100 }}
            className="absolute -right-12 top-1/4 p-6 rounded-3xl bg-card/70 dark:bg-black/40 backdrop-blur-3xl border border-border dark:border-white/10 shadow-2xl z-30"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
                <TrendingUp />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Revenue Growth</p>
                <p className="text-2xl font-black">+142%</p>
              </div>
            </div>
            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
               <motion.div initial={{ width: 0 }} animate={{ width: "80%" }} transition={{ duration: 2, delay: 1 }} className="h-full bg-primary" />
            </div>
          </motion.div>

          <motion.div
            style={{ y: widget2Y, translateZ: 150 }}
            className="absolute -left-16 bottom-1/3 p-6 rounded-3xl bg-card/70 dark:bg-black/40 backdrop-blur-3xl border border-border dark:border-white/10 shadow-2xl z-30"
          >
             <div className="w-14 h-14 rounded-2xl bg-accent/20 flex items-center justify-center text-accent mb-4">
                <PieChart />
             </div>
             <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Expenses</p>
             <p className="text-2xl font-black text-rose-500">- $2,490</p>
          </motion.div>
          
          <motion.div
            style={{ y: widget3Y, translateZ: 200 }}
            className="absolute right-1/4 -bottom-10 h-16 px-8 rounded-full bg-accent text-accent-foreground shadow-[0_20px_50px_rgba(255,255,255,0.2)] flex items-center gap-4 z-40 border border-white/20"
          >
             <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-accent">
                <Plus strokeWidth={3} className="h-4 w-4" />
             </div>
             <span className="font-black uppercase tracking-widest text-sm">Invoice Created</span>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
