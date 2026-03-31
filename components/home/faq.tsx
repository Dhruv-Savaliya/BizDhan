"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { FAQ_CONTENT } from "@/constants/home/faq-constants";

const ease = [0.16, 1, 0.3, 1] as const;

function FAQItem({ faq, index, isOpen, toggleOpen }: { faq: any, index: number, isOpen: boolean, toggleOpen: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.05, ease }}
      viewport={{ once: true, margin: "-40px" }}
      className={`group relative overflow-hidden rounded-2xl border transition-all duration-500 ease-out ${
        isOpen 
          ? "border-primary/50 bg-primary/[0.03] shadow-lg shadow-primary/5" 
          : "border-border dark:border-white/10 bg-muted/20 dark:bg-white/5 hover:border-border dark:hover:border-white/20 hover:bg-muted/40 dark:hover:bg-white/10 shadow-sm"
      }`}
    >
      {/* Animated gradient background that only shows when open */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/5 pointer-events-none"
          />
        )}
      </AnimatePresence>

      <button
        onClick={toggleOpen}
        className="relative z-10 flex w-full items-center justify-between px-6 py-5 md:px-8 md:py-6 text-left outline-none"
      >
        <span className={`text-base md:text-lg font-bold tracking-tight transition-colors duration-300 pr-8 ${isOpen ? "text-primary dark:text-primary" : "text-foreground group-hover:text-primary/80"}`}>
          {faq.question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 135 : 0, scale: isOpen ? 1.1 : 1 }}
          transition={{ duration: 0.4, ease }}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 ${isOpen ? "border-primary/40 bg-primary/10 text-primary" : "border-border shadow-sm text-muted-foreground group-hover:border-primary/30 group-hover:text-primary"}`}
        >
          <Plus strokeWidth={2.5} className="h-4 w-4" />
        </motion.div>
      </button>

      {/* Liquid height expansion */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.section
            initial={{ height: 0, opacity: 0, filter: "blur(4px)" }}
            animate={{ height: "auto", opacity: 1, filter: "blur(0px)" }}
            exit={{ height: 0, opacity: 0, filter: "blur(4px)" }}
            transition={{ duration: 0.4, ease }}
            className="overflow-hidden"
          >
            <div className="relative z-10 px-6 pb-6 md:px-8 md:pb-8 pt-0 text-[15px] md:text-base leading-relaxed text-muted-foreground">
              <div className="pt-2 border-t border-primary/10">
                {faq.answer}
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0); // Open first one by default for engagement
  const faqs = FAQ_CONTENT.items;

  return (
    <section className="py-32 md:py-40 px-4 relative overflow-hidden bg-background" id={FAQ_CONTENT.id}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-[400px] bg-primary/[0.04] dark:bg-primary/10 rounded-full blur-[150px]" />
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_50%_40%_at_50%_0%,#000_10%,transparent_100%)] opacity-20 dark:opacity-40" />
      </div>

      <div className="container mx-auto relative z-10 max-w-7xl">
        <motion.div
           className="text-center mb-20 md:mb-24"
           initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
           whileInView={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
           transition={{ duration: 0.9, ease }}
           viewport={{ once: true, margin: "-100px" }}
        >
          <div className="inline-flex items-center justify-center px-5 py-2 rounded-full bg-primary/10 text-primary text-sm font-bold tracking-widest uppercase mb-8 ring-1 ring-primary/30 shadow-[0_0_20px_rgba(45,212,191,0.2)]">
            {FAQ_CONTENT.eyebrow}
          </div>
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-black text-foreground mb-8 tracking-tighter leading-[1.1]">
            {FAQ_CONTENT.title}
          </h2>
          <p className="text-muted-foreground max-w-3xl mx-auto text-xl md:text-2xl leading-relaxed font-medium">
            {FAQ_CONTENT.description}
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto space-y-4 perspective-1000">
          {faqs.map((faq, index) => (
            <FAQItem 
              key={index} 
              faq={faq} 
              index={index} 
              isOpen={openIndex === index}
              toggleOpen={() => setOpenIndex(openIndex === index ? null : index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
