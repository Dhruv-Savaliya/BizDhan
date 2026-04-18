"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building2, Loader2, User } from "lucide-react";
import { setActiveWorkspaceKindAction } from "@/app/actions/workspace";

export function SelectWorkspacePanel() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(kind: "personal" | "sme") {
    startTransition(async () => {
      const result = await setActiveWorkspaceKindAction(kind);
      if (!result.ok) {
        toast.error(result.error || "Could not switch workspace");
        return;
      }
      router.push(kind === "personal" ? "/tracker/personal/dashboard" : "/tracker/sme/dashboard");
    });
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Choose a workspace</h1>
        <p className="text-sm text-muted-foreground">
          You have both Personal and SME accounts. Pick which one you want to use right now. You can
          switch anytime from the tracker sidebar.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => choose("personal")}
          className="group rounded-2xl border border-border/60 bg-card/40 p-6 text-left transition-all hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {pending ? <Loader2 className="h-6 w-6 animate-spin" /> : <User className="h-6 w-6" />}
          </div>
          <h2 className="font-semibold text-foreground">Personal</h2>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            Budgets, income, expenses, and investments for yourself.
          </p>
          <span className="mt-4 flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm">
            Continue
          </span>
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={() => choose("sme")}
          className="group rounded-2xl border border-border/60 bg-card/40 p-6 text-left transition-all hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            {pending ? <Loader2 className="h-6 w-6 animate-spin" /> : <Building2 className="h-6 w-6" />}
          </div>
          <h2 className="font-semibold text-foreground">SME</h2>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            Purchases, invoices, runway, and reports for your business.
          </p>
          <span className="mt-4 flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700">
            Continue
          </span>
        </button>
      </div>
    </div>
  );
}
