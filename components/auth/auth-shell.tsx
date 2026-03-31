"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AuthVisuals } from "./auth-visuals";

type AuthShellProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  sideNote?: string;
};

export function AuthShell({ title, description, children, sideNote }: AuthShellProps) {
  const router = useRouter();

  return (
    <div className="relative flex min-h-screen overflow-hidden">
      {/* 2D/3D Animated Brand Panel */}
      <AuthVisuals />

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 bg-background relative">
        <div className="pointer-events-none absolute inset-0 -z-10 lg:hidden">
          <div className="absolute left-[-8%] top-[10%] h-80 w-80 rounded-full bg-primary/8 blur-[100px]" />
          <div className="absolute right-[-8%] bottom-[5%] h-96 w-96 rounded-full bg-accent/8 blur-[100px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md"
        >
          <Button
            variant="ghost"
            size="icon"
            className="mb-6 rounded-xl hover:bg-muted"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          {/* Mobile brand */}
          <div className="lg:hidden mb-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="font-bold text-xl">
                <span className="text-foreground">Bizd</span>
                <span className="gradient-text">han</span>
              </div>
            </Link>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{description}</p>

          {sideNote ? (
            <div className="mt-4 rounded-xl bg-primary/5 border border-primary/10 px-4 py-2.5 text-xs text-muted-foreground">
              {sideNote}
            </div>
          ) : null}

          <div className="mt-8">{children}</div>
        </motion.div>
      </div>
    </div>
  );
}
