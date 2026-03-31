"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, TrendingUp, Wallet, ArrowRight, ShieldCheck } from "lucide-react";

export function AuthVisuals() {
  const [mounted, setMounted] = useState(false);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth springs for 3D rotation
  const springConfig = { damping: 20, stiffness: 100, mass: 0.5 };
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [15, -15]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-15, 15]), springConfig);

  // Parallax offsets for floating elements
  const x1 = useSpring(useTransform(mouseX, [-0.5, 0.5], [-20, 20]), springConfig);
  const y1 = useSpring(useTransform(mouseY, [-0.5, 0.5], [-20, 20]), springConfig);
  
  const x2 = useSpring(useTransform(mouseX, [-0.5, 0.5], [30, -30]), springConfig);
  const y2 = useSpring(useTransform(mouseY, [-0.5, 0.5], [30, -30]), springConfig);

  const x3 = useSpring(useTransform(mouseX, [-0.5, 0.5], [-10, 10]), springConfig);
  const y3 = useSpring(useTransform(mouseY, [-0.5, 0.5], [10, -10]), springConfig);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Normalize to -0.5 to 0.5
    mouseX.set(x / width - 0.5);
    mouseY.set(y / height - 0.5);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  if (!mounted) return <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] bg-primary" />;

  return (
    <div 
      className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative overflow-hidden bg-primary items-center justify-center p-12"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ perspective: "1500px" }}
    >
      {/* 2D Background Animations: Glowing animated orbs */}
      <motion.div 
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/95 to-primary/80 z-0" />
        
        {/* Animated gradients */}
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[20%] -right-[10%] w-[500px] h-[500px] bg-teal-400/30 rounded-full blur-[100px] mix-blend-screen"
        />
        <motion.div 
           animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-[40%] -left-[20%] w-[600px] h-[600px] bg-accent/30 rounded-full blur-[120px] mix-blend-screen"
        />
        
        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.15]" 
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            backgroundPosition: "center center",
          }}
        />
      </motion.div>

      {/* 2D Floating particles */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white/20"
            style={{
              width: Math.random() * 6 + 2,
              height: Math.random() * 6 + 2,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, Math.random() * -100 - 50],
              opacity: [0, 0.8, 0],
            }}
            transition={{
              duration: Math.random() * 5 + 5,
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * 5,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-lg flex flex-col h-full justify-between py-8">
        {/* Brand */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <Link href="/" className="inline-flex items-center gap-2 mb-12 group">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-xl shadow-black/10 transition-transform group-hover:scale-105">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="font-bold text-2xl tracking-tight text-white drop-shadow-sm">
              Bizd<span className="text-teal-300">han</span>
            </div>
          </Link>
        </motion.div>

        {/* 3D Interactive Mockup Centerpiece */}
        <div className="flex-1 flex items-center justify-center pointer-events-none">
          <motion.div 
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
            className="relative w-full aspect-square max-w-[400px]"
          >
            {/* Main glass card */}
            <motion.div 
              style={{ x: x3, y: y3, z: 0 }}
              className="absolute inset-0 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <div className="text-white/60 text-sm font-medium mb-1">Total Balance</div>
                  <div className="text-3xl font-bold text-white tracking-tight">$124,592.50</div>
                </div>
                <div className="w-12 h-12 rounded-full bg-teal-400/20 flex items-center justify-center border border-teal-400/30">
                  <Wallet className="h-6 w-6 text-teal-300" />
                </div>
              </div>

              {/* Fake chart */}
              <div className="flex-1 relative flex items-end justify-between gap-2 mt-4 opacity-80 inner-glow">
                {[40, 70, 45, 90, 65, 100, 85].map((height, i) => (
                  <motion.div 
                    key={i} 
                    className="flex-1 rounded-t-sm"
                    style={{
                      background: `linear-gradient(to top, rgba(94, 234, 212, 0.8), rgba(94, 234, 212, 0.2))`,
                      height: `${height}%`,
                    }}
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ duration: 1, delay: i * 0.1, ease: "easeOut" }}
                  />
                ))}
              </div>
            </motion.div>

            {/* Floating Widget 1 */}
            <motion.div 
              style={{ x: x1, y: y1, z: 50 }}
              className="absolute -right-6 top-1/4 bg-white/15 backdrop-blur-2xl border border-white/30 rounded-2xl p-4 shadow-2xl w-[180px]"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-accent/30 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-accent" />
                </div>
                <div className="text-xs font-semibold text-white">+14.2% Growth</div>
              </div>
              <div className="text-[10px] text-white/70">Compared to last month</div>
            </motion.div>

            {/* Floating Widget 2 */}
            <motion.div 
              style={{ x: x2, y: y2, z: 80 }}
              className="absolute -left-8 bottom-1/4 bg-white/15 backdrop-blur-2xl border border-white/30 rounded-2xl p-4 shadow-2xl w-[200px]"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-emerald-400/30 flex items-center justify-center">
                  <ShieldCheck className="h-4 w-4 text-emerald-300" />
                </div>
                <div className="font-semibold text-white text-sm">Secure Data</div>
              </div>
              <div className="text-[11px] text-white/70 leading-tight">Bank-grade encryption protects your assets.</div>
            </motion.div>

          </motion.div>
        </div>

        {/* Bottom Text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="mt-12"
        >
          <h2 className="text-3xl font-bold text-white mb-4 leading-tight">
            Elevate your financial workflow.
          </h2>
          <p className="text-white/70 text-base leading-relaxed max-w-md">
            Unify your personal budgets and SME operations under an intelligent, secure, and beautiful platform.
          </p>
          
          <div className="flex items-center gap-6 mt-8">
            <div className="flex -space-x-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-primary/50 overflow-hidden shadow-lg shadow-black/10 bg-white/10 flex items-center justify-center text-xs text-white">
                  <div className="w-full h-full bg-gradient-to-br from-white/20 to-transparent flex items-center justify-center shrink-0" />
                </div>
              ))}
            </div>
            <div className="text-sm font-medium text-white/80 flex items-center gap-2">
              Join 1,000+ others <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
