"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type FieldPath } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Loader2, CheckCircle2, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getSignupUserFields, buildUserExtraZodShape } from "@/types/user-schema";
import type { SignupMode } from "@/types/workspace";
import { AuthVisuals } from "@/components/auth/auth-visuals";
import { StepProgress } from "@/components/auth/step-progress";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { motion, AnimatePresence } from "framer-motion";

const passwordValidation = new RegExp(
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/
);

const extraShape = buildUserExtraZodShape();

const formSchema = z
  .object({
    fullName: z.string().min(2, "Full name must be at least 2 characters."),
    email: z.string().email("Please enter a valid email address."),
    password: z
      .string()
      .regex(
        passwordValidation,
        "Password must be 8+ chars, with 1 uppercase, 1 lowercase, 1 number, and 1 special symbol."
      ),
    confirmPassword: z.string(),
    signupMode: z.enum(["personal", "sme", "both"]),
  })
  .extend(extraShape)
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type SignupFormValues = z.infer<typeof formSchema>;

export default function SignupPage() {

  const router = useRouter();
  const [step, setStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const dynamicFields = getSignupUserFields().filter((f) => f.ui !== "checkbox");

  useEffect(() => {
    const redirectIfLoggedIn = async () => {
      try {
        const res = await fetch("/api/auth/me", { method: "GET" });
        if (res.ok) {
          const contentType = res.headers.get("content-type") ?? "";
          const data = contentType.includes("application/json")
            ? ((await res.json()) as { user?: unknown })
            : {};
          if (data.user) {
            router.replace("/");
            return;
          }
        }
      } finally {
        setCheckingSession(false);
      }
    };

    void redirectIfLoggedIn();
  }, [router]);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      signupMode: "personal",
      ...Object.fromEntries(
        getSignupUserFields().map((f) => [
          f.name,
          f.ui === "checkbox" ? false : "",
        ])
      ),
    },
  });


  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const payload = {
        ...values,
        role: "user",
        signupMode: values.signupMode as SignupMode,
      };

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const contentType = res.headers.get("content-type") ?? "";
      const data = contentType.includes("application/json")
        ? ((await res.json()) as {
            message?: string;
            requiresVerification?: boolean;
            userId?: string;
          })
        : {};

      if (!res.ok) {
        throw new Error(data.message || "Signup failed");
      }

      if (data.requiresVerification) {
        toast.success("Account created! Please verify your email.");
        router.push(
          `/verify-otp?userId=${encodeURIComponent(data.userId ?? "")}&email=${encodeURIComponent(values.email)}`
        );
        return;
      }

      toast.success("Account created successfully!");
      const mode = values.signupMode;
      if (mode === "both") {
        router.push("/tracker/select-workspace");
      } else if (mode === "sme") {
        router.push("/tracker/sme/dashboard");
      } else {
        router.push("/tracker/personal/dashboard");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Signup failed";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  const nextStep = async () => {
    let fieldsToValidate: FieldPath<SignupFormValues>[] = [];
    if (step === 0) fieldsToValidate = ["signupMode"];
    if (step === 1) fieldsToValidate = ["fullName", "email", ...dynamicFields.map(f => f.name)];
    
    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) setStep((s) => Math.min(s + 1, 2));
  };

  const prevStep = () => {
    if (step === 0) router.back();
    else setStep((s) => s - 1);
  };

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050508]">
        <div className="w-full max-w-5xl p-8 space-y-3">
          <div className="h-12 animate-pulse rounded-2xl bg-white/5" />
          <div className="h-80 animate-pulse rounded-2xl bg-white/5" />
        </div>
      </div>
    );
  }

  const modeDescriptions: Record<string, { desc: string; icon: LucideIcon }> = {
    personal: { desc: "Budgets, expenses & personal growth", icon: CheckCircle2 },
    sme: { desc: "Billing, dynamic invoicing & ledgers", icon: Sparkles },
    both: { desc: "Sync personal & biz in one cloud hub", icon: CheckCircle2 },
  };

  return (
    <div className="relative min-h-screen flex selection:bg-primary/30 selection:text-primary-foreground">
      {/* Visual Panel */}
      <AuthVisuals />

      {/* Form Panel */}
      <div className="flex-1 overflow-y-auto px-6 py-12 bg-[#050508] relative z-20">
        <div className="mx-auto w-full max-w-lg">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <Button
              variant="ghost"
              size="icon"
              className="mb-10 rounded-2xl bg-white/5 hover:bg-white/10 hover:scale-110 active:scale-95 transition-all text-white border border-white/5"
              onClick={prevStep}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <StepProgress currentStep={step} totalSteps={3} />

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-8"
              >
                <AnimatePresence mode="wait">
                  {/* STEP 0: WORKSPACE MODE */}
                  {step === 0 && (
                    <motion.div
                      key="step0"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="space-y-8"
                    >
                      <div className="space-y-2">
                        <h1 className="text-4xl font-black text-white tracking-tighter">Your Journey Starts Here</h1>
                        <p className="text-sm text-white/40 font-medium">Select your primary workspace to tailor your dashboard.</p>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        {(["personal", "sme", "both"] as const).map((mode) => {
                          const selected = form.watch("signupMode") === mode;
                          return (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => form.setValue("signupMode", mode)}
                              className={`group relative rounded-[2rem] border-2 p-6 text-left transition-all duration-500 overflow-hidden ${
                                selected
                                  ? "border-primary bg-primary/5 shadow-2xl shadow-primary/20"
                                  : "border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/10"
                              }`}
                            >
                              <div className="flex items-center gap-5 relative z-10">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors duration-500 ${
                                  selected ? "bg-primary text-primary-foreground" : "bg-white/5 text-white/40 group-hover:text-white"
                                }`}>
                                   {mode === 'personal' ? <CheckCircle2 className="w-8 h-8" /> : <Sparkles className="w-8 h-8" /> }
                                </div>
                                <div className="flex-1">
                                  <div className="font-black text-xl capitalize text-white flex items-center gap-2">
                                    {mode === "sme" ? "Enterprise (SME)" : mode}
                                    {selected && <motion.div layoutId="check" className="w-2 h-2 bg-primary rounded-full animate-ping" />}
                                  </div>
                                  <div className={`text-sm font-medium transition-colors ${selected ? "text-white/60" : "text-white/20"}`}>
                                    {modeDescriptions[mode].desc}
                                  </div>
                                </div>
                              </div>
                              {selected && (
                                <motion.div 
                                  layoutId="glow"
                                  className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-transparent opacity-50"
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 1: PROFILE INFO */}
                  {step === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="space-y-8"
                    >
                      <div className="space-y-2">
                        <h1 className="text-4xl font-black text-white tracking-tighter">The Basics</h1>
                        <p className="text-sm text-white/40 font-medium">Let&apos;s set up your identity on Bizdhan.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <FormField
                          control={form.control}
                          name="fullName"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel className="text-white/50 font-black uppercase text-[10px] tracking-widest pl-1">Full Name</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="John Doe"
                                  className="rounded-2xl h-14 bg-white/5 border-white/10 text-white placeholder:text-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all font-bold"
                                  {...field}
                                  disabled={isLoading}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel className="text-white/50 font-black uppercase text-[10px] tracking-widest pl-1">Email Terminal</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="john@example.com"
                                  type="email"
                                  className="rounded-2xl h-14 bg-white/5 border-white/10 text-white placeholder:text-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all font-bold"
                                  {...field}
                                  disabled={isLoading}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {dynamicFields.map((def) => (
                          <FormField
                            key={def.name}
                            control={form.control}
                            name={def.name as FieldPath<SignupFormValues>}
                            render={({ field }) => (
                              <FormItem className={def.name === 'username' ? 'md:col-span-2' : ''}>
                                <FormLabel className="text-white/50 font-black uppercase text-[10px] tracking-widest pl-1">{def.label}</FormLabel>
                                <FormControl>
                                  {def.ui === "select" ? (
                                    <Select
                                      onValueChange={field.onChange}
                                      value={typeof field.value === "string" ? field.value : ""}
                                    >
                                      <SelectTrigger className="rounded-2xl h-14 bg-white/5 border-white/10 text-white focus:border-primary/50 focus:ring-primary/20 transition-all font-bold">
                                        <SelectValue placeholder={`Select ${def.label}`} />
                                      </SelectTrigger>
                                      <SelectContent className="bg-[#0A0A0E] border-white/10 rounded-2xl p-2">
                                        {(def.options || []).map((opt) => (
                                          <SelectItem key={opt.value} value={opt.value} className="rounded-xl p-3 focus:bg-primary/20 font-bold">
                                            {opt.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <Input
                                      placeholder={def.placeholder || def.label}
                                      className="rounded-2xl h-14 bg-white/5 border-white/10 text-white placeholder:text-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all font-bold"
                                      name={field.name}
                                      onBlur={field.onBlur}
                                      ref={field.ref}
                                      value={typeof field.value === "string" ? field.value : ""}
                                      onChange={(event) => field.onChange(event.target.value)}
                                      disabled={isLoading}
                                    />
                                  )}
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 2: SECURITY */}
                  {step === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="space-y-8"
                    >
                      <div className="space-y-2">
                        <h1 className="text-4xl font-black text-white tracking-tighter">Secure Account</h1>
                        <p className="text-sm text-white/40 font-medium">Protect your financial world with a strong shield.</p>
                      </div>

                      <div className="space-y-6">
                        <FormField
                          control={form.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white/50 font-black uppercase text-[10px] tracking-widest pl-1">Secret Key</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    className="rounded-2xl h-14 bg-white/5 border-white/10 text-white placeholder:text-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all font-bold pr-14"
                                    {...field}
                                    disabled={isLoading}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-2 top-2 h-10 w-10 text-white/40 hover:bg-white/10 rounded-xl"
                                    onClick={() => setShowPassword(!showPassword)}
                                  >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white/50 font-black uppercase text-[10px] tracking-widest pl-1">Confirm Shield</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    className="rounded-2xl h-14 bg-white/5 border-white/10 text-white placeholder:text-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all font-bold pr-14"
                                    {...field}
                                    disabled={isLoading}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-2 top-2 h-10 w-10 text-white/40 hover:bg-white/10 rounded-xl"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                  >
                                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Navigation Buttons */}
                <div className="pt-4 flex items-center gap-4">
                  {step < 2 ? (
                    <Button
                      type="button"
                      onClick={nextStep}
                      className="w-full rounded-[2rem] h-16 bg-primary text-primary-foreground font-black text-xl shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      Next Step
                      <ArrowRight className="ml-3 h-6 w-6" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full rounded-[2rem] h-20 bg-primary text-primary-foreground font-black text-2xl shadow-2xl shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all group overflow-hidden"
                    >
                      {isLoading ? (
                        <Loader2 className="animate-spin h-8 w-8" />
                      ) : (
                        <span className="flex items-center">
                          Construct Account
                          <motion.div
                            animate={{ x: [0, 5, 0] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                          >
                            <Sparkles className="ml-4 h-8 w-8" />
                          </motion.div>
                        </span>
                      )}
                    </Button>
                  )}
                </div>
              </form>
            </Form>

            <div className="mt-10 text-center">
              <p className="text-white/30 text-sm font-bold">
                Already part of the network?{" "}
                <Link href="/login" className="text-primary hover:text-white transition-all underline underline-offset-8 decoration-primary/30 hover:decoration-white">
                  Establish Session
                </Link>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
