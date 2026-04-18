"use client";

import { useRouter, usePathname } from "next/navigation";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";

export function useWorkspaceSwitcher(params: {
  both: boolean;
  personalWorkspaceId?: string;
  smeWorkspaceId?: string;
  defaultWorkspaceId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const activeWorkspace = useMemo<"personal" | "sme">(() => {
    if (!params.both) {
      return params.smeWorkspaceId ? "sme" : "personal";
    }
    return params.smeWorkspaceId && params.defaultWorkspaceId === params.smeWorkspaceId
      ? "sme"
      : "personal";
  }, [params.both, params.defaultWorkspaceId, params.smeWorkspaceId]);

  const switchWorkspace = useCallback(
    async (kind: "personal" | "sme") => {
      if (!params.both || kind === activeWorkspace) return;
      const res = await fetch("/api/auth/active-workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      if (!res.ok) {
        toast.error("Could not switch workspace");
        return;
      }

      if (pathname.includes("/personal/dashboard") && kind === "sme") {
        router.replace("/tracker/sme/dashboard");
        return;
      }
      if (pathname.includes("/sme/dashboard") && kind === "personal") {
        router.replace("/tracker/personal/dashboard");
        return;
      }
      router.refresh();
    },
    [params.both, activeWorkspace, pathname, router]
  );

  return { activeWorkspace, switchWorkspace };
}
