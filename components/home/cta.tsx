"use client";
import { motion, useScroll, useTransform, useSpring, useMotionValue, useMotionTemplate } from "framer-motion";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { ctaConfig } from "@/constants/home/cta-constants";
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
    x.set(middleX * 0.35);
    y.set(middleY * 0.35);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY }}
      className="w-full sm:w-auto"
    >
      <Button
        ref={btnRef}
        variant={variant}
        size={size}
        className={className}
        asChild={asChild}
      >
        {asChild ? <Link href={href}>{children}</Link> : children}
      </Button>
    </motion.div>
  );
}

export function CTA() {
  const { badge, heading, features, buttons, dashboard } = ctaConfig;
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "15%"]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.95, 1, 0.95]);

  return (
    <section
      ref={sectionRef}
      className="py-32 md:py-48 px-4 relative overflow-hidden bg-background"
    >
      {/* Liquid Premium Background */}
      <motion.div 
        style={{ y: bgY, scale }} 
        className="absolute inset-4 md:inset-8 z-0 rounded-[3rem] overflow-hidden shadow-2xl"
      >
        <div className="absolute inset-0 bg-[#0A0A0E]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(45,212,191,0.2),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_100%,rgba(139,92,246,0.15),transparent_50%)]" />
        
        {/* Animated Beams */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent animate-[shimmer_3s_infinite_linear]" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent animate-[shimmer_3s_infinite_linear_reverse]" />
        
        {/* Mesh Noise */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05] mix-blend-overlay" />
      </motion.div>

      <div className="container mx-auto relative z-10 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          {/* Left content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-primary text-sm font-black tracking-widest uppercase mb-8 shadow-[0_0_20px_rgba(45,212,191,0.1)]">
              <Sparkles className="h-4 w-4" />
              {badge.text}
            </div>

            <h2 className="text-5xl md:text-6xl lg:text-7xl font-black mb-8 text-white tracking-tighter leading-[1.05]">
              {heading.title}
            </h2>
            <p className="text-white/60 text-xl md:text-2xl mb-12 max-w-xl leading-relaxed font-medium">
              {heading.subtitle}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  className="flex items-start gap-4 bg-white/[0.03] backdrop-blur-2xl p-5 rounded-2xl border border-white/5 group hover:bg-white/[0.06] transition-colors"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 * index, ease }}
                  viewport={{ once: true }}
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-white text-base mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-white/40 text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-5">
              {buttons.map((button, index) => {
                const isPrimary = button.variant === "primary";
                return (
                  <MagneticButton
                    key={index}
                    size="lg"
                    variant={isPrimary ? "default" : "outline"}
                    className={
                      isPrimary
                        ? "bg-primary text-primary-foreground hover:bg-primary/90 font-black text-lg h-16 px-10 rounded-2xl shadow-[0_20px_40px_rgba(45,212,191,0.2)]"
                        : "bg-white/5 border-white/10 text-white hover:bg-white/10 font-black text-lg h-16 px-10 rounded-2xl backdrop-blur-xl"
                    }
                    asChild
                    href={button.href}
                  >
                    {isPrimary ? (
                      <span className="flex items-center">
                        {button.text}
                        <ArrowRight className="ml-3 h-5 w-5" />
                      </span>
                    ) : (
                      button.text
                    )}
                  </MagneticButton>
                );
              })}
            </div>
          </motion.div>

          {/* Right — Interactive 3D Card */}
          <motion.div
            className="hidden lg:block perspective-[2000px]"
            initial={{ opacity: 0, scale: 0.8, filter: "blur(20px)" }}
            whileInView={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 1, ease }}
            viewport={{ once: true }}
          >
            <motion.div
              style={{ transformStyle: "preserve-3d" }}
              whileHover={{ rotateY: 10, rotateX: -5, scale: 1.05 }}
              transition={{ duration: 0.6, ease }}
              className="relative group/card"
            >
              {/* Outer Glow */}
              <div className="absolute -inset-8 bg-primary/20 blur-[100px] opacity-0 group-hover/card:opacity-100 transition-opacity duration-1000" />
              
              <div className="bg-[#050508] backdrop-blur-3xl rounded-[2.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] p-0 border border-white/10 overflow-hidden">
                <div className="bg-white/[0.05] border-b border-white/5 px-8 h-16 flex items-center justify-between">
                  <h4 className="font-black text-white text-xs uppercase tracking-[0.2em]">
                    {dashboard.title}
                  </h4>
                  <div className="flex gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_10px_rgba(45,212,191,0.5)]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                  </div>
                </div>

                <div className="p-8 space-y-5">
                  {dashboard.items.map((item, index) => (
                    <motion.div
                      key={index}
                      className="bg-white/[0.02] hover:bg-white/[0.05] transition-colors rounded-2xl p-5 border border-white/5 flex gap-5 group/item"
                      initial={{ opacity: 0, x: 30 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                      viewport={{ once: true }}
                    >
                      <div className="w-12 h-12 shrink-0 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover/item:border-primary/50 group-hover/item:text-primary transition-all shadow-inner">
                        <item.icon className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-extrabold text-white text-base tracking-tight truncate">
                            {item.title}
                          </span>
                          <span className="text-white/30 text-[10px] font-bold uppercase tracking-widest ml-4">
                            {item.time}
                          </span>
                        </div>
                        <p className="text-white/40 text-sm leading-relaxed line-clamp-2 font-medium">
                          {item.content}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
                
                {/* Internal sheen */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent opacity-20 pointer-events-none" />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
