"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2, Mail, ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthShell } from "@/components/auth/auth-shell";

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const userId = searchParams.get("userId");
  const email = searchParams.get("email");

  useEffect(() => {
    if (!userId && !email) {
      router.replace("/login");
    }
  }, [userId, email, router]);

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length < 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, email, otp }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Verification failed");

      toast.success("Account verified successfully!");
      
      const kinds = data.enabledWorkspaceKinds ?? [];
      if (kinds.includes("personal") && kinds.includes("sme")) {
        router.push("/tracker/select-workspace");
      } else if (kinds.includes("sme")) {
        router.push("/tracker/sme/dashboard");
      } else {
        router.push("/tracker/personal/dashboard");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function onResend() {
    setResending(true);
    try {
      // We can use the forgot-password endpoint to resend OTP if needed, 
      // or create a dedicated resend endpoint. For now, let's assume forgot-password works for both.
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        toast.success("A new OTP has been sent to your email.");
      } else {
        throw new Error("Failed to resend OTP");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthShell
      title="Verify your email"
      description={`We've sent a 6-digit verification code to ${email || "your email"}.`}
    >
      <div className="flex flex-col items-center justify-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <ShieldCheck className="w-8 h-8 text-primary" />
        </div>
      </div>

      <form onSubmit={onVerify} className="space-y-6">
        <div className="space-y-2">
          <Input
            type="text"
            placeholder="000000"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="text-center text-2xl font-black tracking-[1em] h-16 rounded-2xl bg-muted/50 border-none focus-visible:ring-2 focus-visible:ring-primary"
            disabled={isLoading}
          />
          <p className="text-xs text-center text-muted-foreground">
            Enter the 6-digit code from your inbox.
          </p>
        </div>

        <Button
          type="submit"
          className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          disabled={isLoading || otp.length < 6}
        >
          {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "Verify Account"}
        </Button>

        <div className="text-center">
          <button
            type="button"
            onClick={onResend}
            disabled={resending}
            className="text-sm text-primary font-semibold hover:underline decoration-primary/30 underline-offset-4 disabled:opacity-50"
          >
            {resending ? "Sending..." : "Didn't receive a code? Resend"}
          </button>
        </div>

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

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <VerifyOtpContent />
    </Suspense>
  );
}
