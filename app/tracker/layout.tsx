import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserAction } from "@/app/actions/auth";
import { SME_TRACKER_NAV } from "@/constants/tracker/sme-nav";
import { PERSONAL_TRACKER_NAV } from "@/constants/tracker/personal-nav";
import { ChevronRight } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";

type NavItem = { href: string; label: string; sub: string | null };

export default async function TrackerLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUserAction();
  if (!user) redirect("/login");

  const kinds = user.enabledWorkspaceKinds ?? [];
  const hasPersonal = kinds.includes("personal");
  const hasSme = kinds.includes("sme");
  const both = hasPersonal && hasSme;

  let personalNav: readonly NavItem[] = [];
  let smeNav: readonly NavItem[] = [];

  if (both) {
    personalNav = PERSONAL_TRACKER_NAV.map((l) => ({
      href: l.href,
      label: l.label,
      sub: l.sub,
    }));
    smeNav = SME_TRACKER_NAV.map((l) => ({
      href: l.href,
      label: l.label,
      sub: l.sub,
    }));
  } else if (hasSme) {
    smeNav = SME_TRACKER_NAV.map((l) => ({
      href: l.href,
      label: l.label,
      sub: l.sub,
    }));
  } else {
    personalNav = PERSONAL_TRACKER_NAV.map((l) => ({
      href: l.href,
      label: l.label,
      sub: l.sub,
    }));
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-12">
      {/* Background glow for depth */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute top-[20%] left-[-10%] h-[500px] w-[500px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="mx-auto flex w-full max-w-[1400px] gap-6 px-4 sm:px-6 lg:px-8">
        
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 lg:block border-r border-border/60 pr-6">
          <div className="sticky top-24 pt-2 pb-6">
            <h2 className="px-3 text-lg font-bold tracking-tight mb-4 text-foreground">
              {both ? "Workspaces" : "Tracker"}
            </h2>
            <nav className="flex flex-col gap-1">
              {both ? (
                <>
                  <div className="px-3 pb-2 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Personal
                  </div>
                  {personalNav.map((l) => (
                    <Link
                      key={`p-${l.href}`}
                      href={l.href}
                      className="group flex flex-col rounded-xl px-3 py-2 text-sm text-foreground/80 hover:bg-muted transition-colors border border-transparent hover:border-border/50"
                    >
                      <div className="font-medium text-foreground group-hover:text-primary transition-colors flex items-center justify-between">
                        {l.label}
                        <ChevronRight className="h-3 w-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                      </div>
                      {l.sub ? (
                        <div className="mt-0.5 text-[11px] text-muted-foreground/80 leading-snug">
                          {l.sub}
                        </div>
                      ) : null}
                    </Link>
                  ))}
                  <div className="px-3 pb-2 pt-6 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    SME
                  </div>
                  {smeNav.map((l) => (
                    <Link
                      key={`s-${l.href}`}
                      href={l.href}
                      className="group flex flex-col rounded-xl px-3 py-2 text-sm text-foreground/80 hover:bg-muted transition-colors border border-transparent hover:border-border/50"
                    >
                      <div className="font-medium text-foreground group-hover:text-primary transition-colors flex items-center justify-between">
                        {l.label}
                        <ChevronRight className="h-3 w-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                      </div>
                      {l.sub ? (
                        <div className="mt-0.5 text-[11px] text-muted-foreground/80 leading-snug">
                          {l.sub}
                        </div>
                      ) : null}
                    </Link>
                  ))}
                </>
              ) : (
                [...personalNav, ...smeNav].map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="group flex flex-col rounded-xl px-3 py-2 text-sm text-foreground/80 hover:bg-muted transition-colors border border-transparent hover:border-border/50"
                  >
                    <div className="font-medium text-foreground group-hover:text-primary transition-colors flex items-center justify-between">
                      {l.label}
                      <ChevronRight className="h-3 w-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                    </div>
                    {l.sub ? (
                      <div className="mt-0.5 text-[11px] text-muted-foreground/80 leading-snug">
                        {l.sub}
                      </div>
                    ) : null}
                  </Link>
                ))
              )}
            </nav>
            <div className="mt-8 px-3">
              <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/30 p-2">
                <span className="text-xs font-medium text-muted-foreground px-2">Theme</span>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="min-w-0 flex-1 relative z-10 w-full overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
