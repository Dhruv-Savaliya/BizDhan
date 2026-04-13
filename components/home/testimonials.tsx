"use client";
import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import Image from "next/image";
import { TESTIMONIALS_CONTENT } from "@/constants/home/testimonials-constants";
import type { Testimonial } from "@/constants/home/testimonials-constants";

const ease = [0.16, 1, 0.3, 1] as const;

export function Testimonials() {
  const testimonials = TESTIMONIALS_CONTENT.items;
  const communityAvatars = TESTIMONIALS_CONTENT.communityAvatars;

  const topRow = testimonials.slice(0, Math.ceil(testimonials.length / 2));
  const bottomRow = testimonials.slice(Math.ceil(testimonials.length / 2));

  const topRowDuplicated = [...topRow, ...topRow, ...topRow, ...topRow];
  const bottomRowDuplicated = [...bottomRow, ...bottomRow, ...bottomRow, ...bottomRow];

  return (
    <section
      className="py-32 md:py-40 relative overflow-hidden bg-background"
      id={TESTIMONIALS_CONTENT.id}
    >
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-primary/5 rounded-full blur-[150px]" />
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_10%,transparent_100%)]" />
      </div>

      <div className="container mx-auto px-4 relative z-10 mb-20 md:mb-24">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
          whileInView={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.9, ease }}
          viewport={{ once: true, margin: "-100px" }}
        >
          <div className="inline-flex items-center justify-center px-5 py-2 rounded-full bg-primary/10 text-primary text-sm font-bold tracking-widest uppercase mb-8 ring-1 ring-primary/30 shadow-[0_0_20px_rgba(45,212,191,0.2)]">
            {TESTIMONIALS_CONTENT.eyebrow}
          </div>
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-black text-foreground mb-8 tracking-tighter leading-[1.1]">
            {TESTIMONIALS_CONTENT.title}
          </h2>
          <p className="text-muted-foreground max-w-3xl mx-auto text-xl md:text-2xl leading-relaxed font-medium">
            {TESTIMONIALS_CONTENT.description}
          </p>
        </motion.div>
      </div>

      {/* Infinite scrolling marquee wrapper */}
      <div className="relative z-10 w-full flex flex-col gap-8 overflow-hidden">
        {/* Wider, smoother fades */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-[20%] lg:w-[30%] bg-gradient-to-r from-background via-background/80 to-transparent z-20" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-[20%] lg:w-[30%] bg-gradient-to-l from-background via-background/80 to-transparent z-20" />

        <motion.div
          className="flex w-max gap-8 pl-8"
          animate={{ x: [0, -100 * topRow.length] }}
          transition={{ ease: "linear", duration: 40, repeat: Infinity, repeatType: "loop" }}
          whileHover={{ animationPlayState: "paused" }}
          style={{ width: `${topRowDuplicated.length * 432}px` }} 
        >
          {topRowDuplicated.map((testimonial, index) => (
            <TestimonialCard key={`top-${index}`} testimonial={testimonial} />
          ))}
        </motion.div>

        <motion.div
          className="flex w-max gap-8 pl-8"
          animate={{ x: [-100 * bottomRow.length, 0] }}
          transition={{ ease: "linear", duration: 45, repeat: Infinity, repeatType: "loop" }}
          whileHover={{ animationPlayState: "paused" }}
          style={{ width: `${bottomRowDuplicated.length * 432}px` }}
        >
          {bottomRowDuplicated.map((testimonial, index) => (
            <TestimonialCard key={`bot-${index}`} testimonial={testimonial} />
          ))}
        </motion.div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          className="mt-32 flex flex-col items-center gap-6"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease }}
          viewport={{ once: true }}
        >
          <div className="flex -space-x-5">
            {communityAvatars.map((avatarUrl, i) => (
              <motion.div
                key={i}
                className="w-16 h-16 rounded-full border-[4px] border-background overflow-hidden relative shadow-2xl z-10 hover:z-20 hover:scale-110 transition-transform duration-300"
                initial={{ opacity: 0, x: -20, scale: 0.5 }}
                whileInView={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ delay: 0.2 + i * 0.1, duration: 0.6, ease }}
                viewport={{ once: true }}
              >
                <Image
                  src={avatarUrl}
                  alt={`User ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </motion.div>
            ))}
          </div>
          <p className="text-muted-foreground text-xl md:text-2xl font-medium tracking-tight">
            Join <span className="font-bold text-foreground mx-1 text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">1,000+</span> users worldwide building their financial future
          </p>
        </motion.div>
      </div>
    </section>
  );
}

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <div className="w-[400px] shrink-0 py-4">
      <div className="h-full group relative bg-background/40 backdrop-blur-2xl rounded-3xl border border-white/5 p-8 flex flex-col shadow-2xl hover:shadow-[0_0_40px_rgba(45,212,191,0.15)] hover:-translate-y-2 hover:bg-black/10 dark:hover:bg-white/5 transition-all duration-500 overflow-hidden">
        
        {/* Animated gradient top border */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700 ease-in-out" />
        
        <div className="mb-8 flex items-center justify-between relative z-10">
          <Quote className="h-12 w-12 text-primary/20 group-hover:text-primary/40 transition-colors duration-500" />
          <div className="flex gap-1.5">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`h-5 w-5 transition-all duration-500 ${
                  i < testimonial.rating
                    ? "text-amber-400 fill-amber-400 group-hover:drop-shadow-[0_0_12px_rgba(251,191,36,0.8)] group-hover:scale-110"
                    : "text-border"
                }`}
                style={{ transitionDelay: `${i * 50}ms` }}
              />
            ))}
          </div>
        </div>

        <p className="text-foreground/90 text-lg leading-relaxed flex-1 mb-8 relative z-10">
          &quot;{testimonial.content}&quot;
        </p>

        <div className="flex items-center gap-5 pt-6 border-t border-border/40 relative z-10">
          <div className="relative w-14 h-14 rounded-full overflow-hidden flex-shrink-0 ring-4 ring-primary/10 group-hover:ring-primary/40 transition-all duration-500">
            <Image
              src={testimonial.avatar}
              alt={testimonial.author}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-500"
              sizes="56px"
            />
          </div>
          <div>
            <div className="font-extrabold text-lg text-foreground tracking-tight group-hover:text-primary transition-colors duration-300">
              {testimonial.author}
            </div>
            <div className="text-sm text-muted-foreground font-semibold">
              {testimonial.role}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
