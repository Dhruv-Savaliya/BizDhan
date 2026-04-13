"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Send, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { submitContactForm } from "@/app/actions/contact";
import type { AnimatedInputProps } from "@/types/home";

const ease = [0.16, 1, 0.3, 1] as const;

function AnimatedInput({ id, label, isTextarea = false, ...props }: AnimatedInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const Component = isTextarea ? "textarea" : "input";

  return (
    <div className="space-y-2 relative">
      <label htmlFor={id} className="text-sm font-medium text-foreground relative z-20 transition-colors duration-300">
        <span className={isFocused ? "text-primary drop-shadow-[0_0_8px_rgba(45,212,191,0.5)]" : ""}>{label}</span>
      </label>
      <div className="relative group/input flex items-center justify-center">
        {/* Animated Conic Gradient Border on Focus */}
        <AnimatePresence>
          {isFocused && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute -inset-[2px] rounded-[14px] z-0 overflow-hidden pointer-events-none opacity-100"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute inset-[-100%] w-[300%] h-[300%] bg-[conic-gradient(from_90deg_at_50%_50%,rgba(45,212,191,0)_0%,rgba(45,212,191,0.8)_50%,rgba(45,212,191,0)_100%)] blur-[2px]"
              />
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Cover for input background (allows gradient to peek through edges) */}
        {isFocused && <div className="absolute inset-[1px] bg-background/95 rounded-[11px] z-10 pointer-events-none" />}

        <Component
          {...props}
          id={id}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          // Browser extensions (e.g. autofill) inject attrs like fdprocessedid before hydration
          suppressHydrationWarning
          className={`relative z-20 w-full bg-background/50 focus:bg-transparent border border-white/10 dark:border-white/5 rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder:text-muted-foreground ${isTextarea ? "resize-none min-h-[120px]" : "h-12"} ${isFocused ? "border-transparent text-foreground" : "hover:border-primary/30"}`}
        />
      </div>
    </div>
  );
}

export function Contact() {
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);

    const formData = new FormData(e.currentTarget);
    const result = await submitContactForm(formData);

    setIsPending(false);

    if (result.success) {
      setIsSuccess(true);
      toast.success("Message sent successfully! We'll be in touch soon.");
      (e.target as HTMLFormElement).reset();
      
      // Reset success state
      setTimeout(() => setIsSuccess(false), 5000);
    } else {
      toast.error(result.message || "Failed to send message. Please try again.");
    }
  }

  return (
    <section className="py-32 md:py-40 px-4 relative overflow-hidden bg-background" id="contact">
      {/* Background elements */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-primary/5 rounded-full blur-[200px]" />
      </div>

      <div className="container mx-auto relative z-10 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          
          {/* Left: Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-8 ring-1 ring-primary/20 shadow-sm">
              Get in Touch
            </div>
            <h2 className="text-5xl md:text-6xl lg:text-7xl font-black text-foreground mb-8 tracking-tighter leading-[1.1]">
              Let's talk about <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">your business.</span>
            </h2>
            <p className="text-muted-foreground text-xl md:text-2xl leading-relaxed mb-12 max-w-lg font-medium">
              Ready to transform your financial operations? Our team is standing by to help you integrate Bizdhan.
            </p>

            <div className="space-y-6">
              <div className="flex items-center gap-5 p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md w-max hover:bg-white/10 transition-colors">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary shadow-inner border border-primary/20">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-foreground">Direct Email</h4>
                  <p className="text-base text-primary font-medium tracking-tight">hello@bizdhan.com</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right: Form */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
            whileInView={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.8, delay: 0.2, ease }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 via-accent/30 to-primary/30 rounded-[2rem] blur opacity-30 group-hover:opacity-60 transition duration-700 animate-pulse" />
              
              <div className="relative bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-8 md:p-10 shadow-2xl overflow-hidden">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <AnimatedInput id="name" name="name" label="First Name" placeholder="John" required />
                    <AnimatedInput id="lastName" name="lastName" label="Last Name" placeholder="Doe" />
                  </div>

                  <AnimatedInput id="email" name="email" type="email" label="Email Address" placeholder="john@example.com" required />
                  <AnimatedInput id="message" name="message" label="Message" isTextarea={true} placeholder="How can we help you?" required />

                  <Button 
                    type="submit" 
                    suppressHydrationWarning
                    className="w-full h-14 rounded-xl text-lg font-bold shadow-[0_0_20px_rgba(45,212,191,0.3)] hover:shadow-[0_0_30px_rgba(45,212,191,0.5)] transition-all duration-300 relative overflow-hidden group/btn disabled:opacity-90 disabled:cursor-wait"
                    disabled={isPending || isSuccess}
                  >
                    <AnimatePresence mode="wait">
                      {isPending ? (
                        <motion.div key="pending" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-center">
                          <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                          Sending...
                        </motion.div>
                      ) : isSuccess ? (
                        <motion.div key="success" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center text-green-100">
                          <CheckCircle2 className="mr-3 h-6 w-6" />
                          Message Sent!
                        </motion.div>
                      ) : (
                        <motion.div key="default" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: 20 }} className="flex items-center justify-center w-full">
                          <span className="relative z-10 transition-transform duration-300 group-hover/btn:-translate-x-2">Send Message</span>
                          <Send className="absolute right-1/2 translate-x-12 opacity-0 group-hover/btn:opacity-100 group-hover/btn:translate-x-20 transition-all duration-300 h-5 w-5 text-primary-foreground" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Button>
                </form>
              </div>
            </div>
          </motion.div>
          
        </div>
      </div>
    </section>
  );
}
