import type { ReactNode } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUserAction } from "@/app/actions/auth";
import { SME_TRACKER_NAV } from "@/constants/tracker/sme-nav";
import { PERSONAL_TRACKER_NAV } from "@/constants/tracker/personal-nav";
import { Zap } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { TrackerSidebar } from "@/components/tracker/tracker-sidebar";
import { TrackerMobileNav } from "@/components/tracker/tracker-mobile-nav";
import {
  ACTIVE_WORKSPACE_COOKIE,
  getWorkspaceIdsForOwner,
  resolveActiveWorkspaceIdFromCookie,
} from "@/lib/workspace-for-user";

type NavItem = { href: string; label: string; sub: string | null };

export default async function TrackerLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUserAction();
  if (!user) redirect("/login");

  const kinds = user.enabledWorkspaceKinds ?? [];
  const hasPersonal = kinds.includes("personal");
  const hasSme = kinds.includes("sme");
  const both = hasPersonal && hasSme;

  let personalNav: NavItem[] = [];
  let smeNav: NavItem[] = [];

  if (both) {
    personalNav = PERSONAL_TRACKER_NAV.map((l) => ({ href: l.href, label: l.label, sub: l.sub }));
    smeNav = SME_TRACKER_NAV.map((l) => ({ href: l.href, label: l.label, sub: l.sub }));
  } else if (hasSme) {
    smeNav = SME_TRACKER_NAV.map((l) => ({ href: l.href, label: l.label, sub: l.sub }));
  } else {
    personalNav = PERSONAL_TRACKER_NAV.map((l) => ({ href: l.href, label: l.label, sub: l.sub }));
  }

  const userName = user.name ?? user.email;
  const userEmail = user.email;

  const { personalWorkspaceId, smeWorkspaceId } = await getWorkspaceIdsForOwner(user.id);

  const cookieStore = await cookies();
  const cookieKind = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;
  const effectiveDefaultWorkspaceId =
    resolveActiveWorkspaceIdFromCookie({
      cookieKind,
      enabledWorkspaceKinds: kinds,
      personalWorkspaceId,
      smeWorkspaceId,
      fallbackWorkspaceId: user.defaultWorkspaceId,
    }) ?? user.defaultWorkspaceId;

  return (
    <div className="min-h-screen bg-background">
      {/* Background glow for depth */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute top-[20%] left-[-10%] h-[500px] w-[500px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-background/80 backdrop-blur-md border-b border-border/50 z-40 flex items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" fill="currentColor" />
          <span className="font-bold text-lg tracking-tight">Bizdhan</span>
        </Link>
        <div className="hidden lg:block">
          <ThemeToggle />
        </div>
      </div>

      {/* Main Layout Container */}
      <div className="mx-auto flex w-full max-w-[1400px] gap-6 pt-14">
        <TrackerSidebar
          personalNav={personalNav}
          smeNav={smeNav}
          both={both}
          userName={userName}
          userEmail={userEmail}
          personalWorkspaceId={personalWorkspaceId}
          smeWorkspaceId={smeWorkspaceId}
          defaultWorkspaceId={effectiveDefaultWorkspaceId}
        />
        
        {/* Main Content Area */}
        <div className="min-w-0 flex-1 relative z-10 w-full overflow-hidden pt-6 pb-12 px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </div>

      <TrackerMobileNav
        personalNav={personalNav}
        smeNav={smeNav}
        both={both}
        userName={userName}
        userEmail={userEmail}
        personalWorkspaceId={personalWorkspaceId}
        smeWorkspaceId={smeWorkspaceId}
        defaultWorkspaceId={effectiveDefaultWorkspaceId}
      />
    </div>
  );
}
