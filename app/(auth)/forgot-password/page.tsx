"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2, Mail, ArrowLeft, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthShell } from "@/components/auth/auth-shell";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to send reset code");
      }

      toast.success("Reset code sent! Check your inbox.");
      router.push(`/reset-password?email=${encodeURIComponent(email)}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthShell
      title="Forgot password?"
      description="No worries, we'll send you a 6-digit code to reset your password."
    >
      <div className="flex flex-col items-center justify-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <KeyRound className="w-8 h-8 text-primary" />
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-11 h-14 rounded-2xl bg-muted/50 border-none focus-visible:ring-2 focus-visible:ring-primary"
              disabled={isLoading}
              required
            />
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          disabled={isLoading || !email}
        >
          {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "Send Reset Code"}
        </Button>

        <Button
          variant="ghost"
          className="w-full text-muted-foreground gap-2"
          onClick={() => router.push("/login")}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </Button>
      </form>
    </AuthShell>
  );
}
