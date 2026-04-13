"use client";
import { motion, useScroll, useTransform, useMotionTemplate, useMotionValue, useSpring } from "framer-motion";
import { useRef } from "react";
import { FEATURES_CONTENT } from "@/constants/home/features-constants";
import type { FeatureItem } from "@/constants/home/features-constants";

const ease = [0.16, 1, 0.3, 1] as const;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
      ease,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 50, scale: 0.9 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.8, ease } },
};

function FeatureCard({ feature, isFeatured }: { feature: FeatureItem; isFeatured: boolean }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // 3D Tilt values
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const rotateX = useSpring(rx, { stiffness: 150, damping: 20 });
  const rotateY = useSpring(ry, { stiffness: 150, damping: 20 });

  function handleMouseMove({
    currentTarget,
    clientX,
    clientY,
  }: React.MouseEvent) {
    const { left, top, width, height } = currentTarget.getBoundingClientRect();

    const x = clientX - left;
    const y = clientY - top;

    mouseX.set(x);
    mouseY.set(y);

    // Calculate rotation (-10 to 10 degrees)
    rx.set(((y / height) - 0.5) * -20);
    ry.set(((x / width) - 0.5) * 20);
  }

  function handleMouseLeave() {
    rx.set(0);
    ry.set(0);
  }

  return (
    <motion.div
      variants={itemVariants}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformPerspective: 1200 }}
      className={`group relative rounded-[2rem] border border-border dark:border-white/10 bg-muted/30 dark:bg-white/5 p-8 transition-all duration-500 backdrop-blur-xl hover:bg-card dark:hover:bg-white/10 min-h-[320px] shadow-sm hover:shadow-2xl hover:shadow-primary/10 dark:shadow-primary/5 ${
        isFeatured ? "md:col-span-2" : ""
      }`}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-[2rem] opacity-0 transition duration-500 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              600px circle at ${mouseX}px ${mouseY}px,
              rgba(45, 212, 191, 0.15),
              transparent 80%
            )
          `,
        }}
      />
      
      {/* 3D Border glow */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 delay-100" />

      {/* Floating internal content (parallax effect) */}
      <motion.div 
        style={{ translateZ: 50 }} 
        className="relative z-10 flex flex-col h-full transform-style-3d"
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/5 flex items-center justify-center mb-8 text-primary shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] border border-primary/20 group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-[0_0_20px_rgba(45,212,191,0.4)] transition-all duration-500 transform-style-3d">
          <feature.icon className="h-7 w-7" style={{ transform: "translateZ(20px)" }} />
        </div>
        <h3 className="text-2xl font-bold text-foreground mb-4 tracking-tight group-hover:text-primary transition-colors duration-500" style={{ transform: "translateZ(30px)" }}>
          {feature.title}
        </h3>
        <p className="text-base text-muted-foreground/90 leading-relaxed flex-1" style={{ transform: "translateZ(10px)" }}>
          {feature.description}
        </p>
      </motion.div>
    </motion.div>
  );
}

export function Features() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  
  // Advanced Parallax layers
  const bgY1 = useTransform(scrollYProgress, [0, 1], ["-20%", "20%"]);
  const bgY2 = useTransform(scrollYProgress, [0, 1], ["10%", "-10%"]);
  const rotate1 = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const rotate2 = useTransform(scrollYProgress, [0, 1], [0, -90]);

  const features = FEATURES_CONTENT.items.map((item) => {
    return {
      icon: item.icon,
      title: item.title,
      description: item.description,
    };
  });

  return (
    <section
      ref={sectionRef}
      className="py-32 md:py-40 px-4 relative overflow-hidden bg-background"
      id={FEATURES_CONTENT.id}
    >
      {/* Animated Parallax Geometric background shapes */}
      <motion.div
        style={{ y: bgY1, rotate: rotate1 }}
        className="absolute top-1/4 right-[10%] w-[800px] h-[800px] bg-primary/[0.03] dark:bg-primary/5 rounded-[100px] blur-[100px] pointer-events-none -z-10 rotate-45"
      />
      <motion.div
        style={{ y: bgY2, rotate: rotate2 }}
        className="absolute bottom-0 left-[5%] w-[600px] h-[600px] bg-accent/[0.04] dark:bg-accent/10 rounded-full blur-[120px] pointer-events-none -z-10"
      />
      <div className="absolute inset-0 bg-[linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_10%,transparent_100%)] opacity-20 dark:opacity-40 pointer-events-none -z-10" />

      <div className="container mx-auto relative z-10 max-w-7xl">
        <motion.div
          className="text-center mb-20 md:mb-32"
          initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
          whileInView={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.9, ease }}
          viewport={{ once: true, margin: "-100px" }}
        >
          <div className="inline-flex items-center justify-center px-5 py-2 rounded-full bg-primary/10 text-primary text-sm font-bold tracking-widest uppercase mb-8 ring-1 ring-primary/30 shadow-[0_0_20px_rgba(45,212,191,0.2)]">
            {FEATURES_CONTENT.eyebrow}
          </div>
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-black text-foreground mb-8 tracking-tighter leading-[1.1]">
            {FEATURES_CONTENT.title.split(" ").map((word, i) => (
              word === "account" || word === "finance" ? <span key={i} className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent inline-block ml-3">{word}</span> : word + " "
            ))}
          </h2>
          <p className="text-muted-foreground max-w-3xl mx-auto text-xl md:text-2xl leading-relaxed font-medium">
            {FEATURES_CONTENT.description}
          </p>
        </motion.div>

        {/* Bento Grid */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 perspective-2000"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {features.map((feature, index) => {
            const isFeatured = index === 0 || index === 3;
            return (
              <FeatureCard 
                key={index} 
                feature={feature} 
                isFeatured={isFeatured} 
              />
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}