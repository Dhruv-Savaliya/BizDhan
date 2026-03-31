"use client";

import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/navbar";
import { Hero } from "@/components/home/hero";
import { Features } from "@/components/home/features";
import { Testimonials } from "@/components/home/testimonials";
import { CTA } from "@/components/home/cta";
import { Contact } from "@/components/home/contact";
import { FAQ } from "@/components/home/faq";
import { Footer } from "@/components/layout/footer";

export default function Home() {
  return (
    <motion.div
      className="bg-background text-foreground"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Testimonials />
        <CTA />
        <Contact />
        <FAQ />
      </main>
      <Footer />
    </motion.div>
  );
}
