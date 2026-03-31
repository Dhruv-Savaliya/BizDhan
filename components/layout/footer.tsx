"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin, Mail, Phone, Sparkles, Send } from "lucide-react";
import { footerConfig } from "@/constants/layout/footer-constants";

const ease = [0.16, 1, 0.3, 1] as const;

export function Footer() {
  const { companyName, tagline, socialLinks, sections, contactInfo, legal } =
    footerConfig;

  return (
    <footer className="relative overflow-hidden bg-[#050508] pt-24 pb-12 border-t border-white/5">
      {/* Decorative Background Elements */}
      <div className="absolute inset-x-0 bottom-0 h-[500px] pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(45,212,191,0.08),transparent_70%)]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[150%] h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-16 mb-24">
          
          {/* Brand & Newsletter */}
          <motion.div
            className="lg:col-span-4"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease }}
            viewport={{ once: true }}
          >
            <Link href="/" className="flex items-center gap-3 mb-8 group">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-[0_0_20px_rgba(45,212,191,0.3)]">
                <Sparkles className="w-6 h-6" />
              </div>
              <span className="text-3xl font-black tracking-tighter text-white">
                {companyName.primary}
                <span className="text-primary">{companyName.secondary}</span>
              </span>
            </Link>
            
            <p className="text-white/40 text-lg mb-10 max-w-sm font-medium leading-relaxed">
              {tagline}
            </p>

            <div className="space-y-4">
               <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Join the evolution</p>
               <div className="relative max-w-sm">
                  <input 
                    type="email" 
                    placeholder="Enter your email" 
                    className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-white/20"
                  />
                  <button className="absolute right-2 top-2 h-10 w-10 flex items-center justify-center bg-primary text-primary-foreground rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-transform">
                    <Send className="w-4 h-4" />
                  </button>
               </div>
            </div>
          </motion.div>

          {/* Nav Sections */}
          <div className="lg:col-span-5 grid grid-cols-2 gap-8">
            {sections.map((section, i) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1 * i, ease }}
                viewport={{ once: true }}
              >
                <h3 className="text-xs font-black text-white uppercase tracking-[0.3em] mb-8">
                  {section.title}
                </h3>
                <ul className="space-y-4">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-white/40 hover:text-primary transition-all text-sm font-bold flex items-center group"
                      >
                        <span className="w-0 group-hover:w-4 overflow-hidden transition-all duration-300 text-primary">→ </span>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          {/* Contact & Social */}
          <motion.div
            className="lg:col-span-3"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease }}
            viewport={{ once: true }}
          >
            <h3 className="text-xs font-black text-white uppercase tracking-[0.3em] mb-8">
              Contact
            </h3>
            <div className="space-y-6 text-sm text-white/40 mb-10">
              <div className="flex items-start gap-4">
                <MapPin className="h-5 w-5 text-primary shrink-0" />
                <span className="font-bold leading-relaxed">
                  {contactInfo.address.line1}<br />
                  {contactInfo.address.line2}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <Mail className="h-5 w-5 text-primary shrink-0" />
                <span className="font-bold">{contactInfo.email}</span>
              </div>
            </div>

            <div className="flex gap-4">
              {socialLinks.map((social) => (
                <Link
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-500 hover:-translate-y-2 group shadow-xl"
                >
                  <social.icon className="h-5 w-5 group-hover:scale-110" />
                </Link>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Legal Footer */}
        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-4 text-[11px] font-black uppercase tracking-[0.2em]">
            <span className="text-white">&copy; {new Date().getFullYear()}</span>
            <span className="text-white/20 whitespace-normal text-center md:text-left">{legal.copyrightText}</span>
          </div>
          
          <div className="flex gap-10">
            {legal.links.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
