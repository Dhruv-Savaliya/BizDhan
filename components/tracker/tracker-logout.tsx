"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function TrackerLogoutMenu() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function signOut() {
    setIsLoggingOut(true);
    try {
      const res = await fetch("/api/auth/signout", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Failed to sign out");
      }
      router.push("/login");
      router.refresh();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to sign out";
      toast.error(message);
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full h-9 rounded-xl border-border/50 bg-muted/40 hover:bg-muted flex items-center justify-center text-xs font-semibold text-rose-500"
      onClick={() => void signOut()}
      disabled={isLoggingOut}
    >
      <LogOut className="h-4 w-4 mr-2" />
      {isLoggingOut ? "Signing out…" : "Log out"}
    </Button>
  );
}

