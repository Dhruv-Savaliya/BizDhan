"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { TrackerLogoutMenu } from "@/components/tracker/tracker-logout";
import {
  TrendingUp,
  TrendingDown,
  PiggyBank,
  BarChart2,
  ShoppingCart,
  FileText,
  LayoutDashboard,
  ChevronRight,
  LucideIcon
} from "lucide-react";

type NavItem = { href: string; label: string; sub: string | null };

type TrackerSidebarProps = {
  personalNav: NavItem[];
  smeNav: NavItem[];
  both: boolean;
  userName: string;
  userEmail: string;
};

const getIconForLabel = (label: string): LucideIcon => {
  const normalized = label.toLowerCase();
  if (normalized.includes("income")) return TrendingUp;
  if (normalized.includes("expense")) return TrendingDown;
  if (normalized.includes("invest")) return PiggyBank;
  if (normalized.includes("report")) return BarChart2;
  if (normalized.includes("purchase")) return ShoppingCart;
  if (normalized.includes("invoice")) return FileText;
  if (normalized.includes("summary")) return LayoutDashboard;
  return LayoutDashboard;
};

export function TrackerSidebar({
  personalNav,
  smeNav,
  both,
  userName,
  userEmail
}: TrackerSidebarProps) {
  const pathname = usePathname();
  const [activeWorkspace, setActiveWorkspace] = useState<"personal" | "sme">("personal");

  const initials = userName
    .split(" ")
    .map(n => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase() || "U";

  let displayedNav: NavItem[] = [];
  if (both) {
    displayedNav = activeWorkspace === "personal" ? personalNav : smeNav;
  } else if (smeNav.length > 0) {
    displayedNav = smeNav;
  } else {
    displayedNav = personalNav;
  }

  return (
    <aside className="sticky top-14 h-[calc(100vh-3.5rem)] w-64 shrink-0 hidden lg:flex flex-col border-r border-border/60 z-30">
      <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden pt-6 pb-6">
        
        {/* User Card */}
        <div className="px-6 pb-6 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
              {initials}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="truncate text-sm font-medium text-foreground">
                {userName}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {userEmail}
              </span>
            </div>
          </div>
        </div>

        {/* Workspace Switcher */}
        {both && (
          <div className="px-6 pt-6">
            <div className="flex rounded-full bg-muted/50 p-1">
              <button
                onClick={() => setActiveWorkspace("personal")}
                className={`flex-1 rounded-full py-1.5 text-xs font-medium transition-colors ${
                  activeWorkspace === "personal"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted/80"
                }`}
              >
                Personal
              </button>
              <button
                onClick={() => setActiveWorkspace("sme")}
                className={`flex-1 rounded-full py-1.5 text-xs font-medium transition-colors ${
                  activeWorkspace === "sme"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted/80"
                }`}
              >
                SME
              </button>
            </div>
          </div>
        )}

        {/* Nav Links */}
        <div className="px-3 pt-6 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={both ? activeWorkspace : "nav"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-1"
            >
              {displayedNav.map((l, i) => {
                const isActive = pathname === l.href;
                const Icon = getIconForLabel(l.label);

                return (
                  <motion.div
                    key={l.href}
                    initial="hidden"
                    animate="visible"
                    whileHover="hover"
                    variants={{
                      hidden: { opacity: 0, x: -10 },
                      visible: { opacity: 1, x: 0, transition: { delay: i * 0.05 } }
                    }}
                  >
                    <Link
                      href={l.href}
                      className={`flex flex-col px-3 py-2 transition-colors ${
                        isActive
                          ? "bg-primary/10 text-primary border-l-2 border-primary rounded-r-xl"
                          : "text-foreground/70 hover:bg-muted hover:text-foreground rounded-xl"
                      }`}
                    >
                      <div className="flex items-center justify-between font-medium text-sm">
                        <div className="flex items-center gap-3">
                          <Icon
                            className={`h-4 w-4 ${
                              isActive ? "text-primary" : "text-muted-foreground"
                            }`}
                          />
                          <span>{l.label}</span>
                        </div>
                        <motion.div
                          variants={{
                            hidden: { opacity: 0, x: -4 },
                            visible: { opacity: isActive ? 1 : 0, x: isActive ? 0 : -4 },
                            hover: { opacity: 1, x: 0 }
                          }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronRight className="h-3 w-3" />
                        </motion.div>
                      </div>
                      {isActive && l.sub && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="pl-7 mt-0.5 text-[11px] text-muted-foreground/70 leading-snug"
                        >
                          {l.sub}
                        </motion.div>
                      )}
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Section */}
        <div className="px-6 pt-6 mt-auto flex flex-col gap-3">
          <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/30 p-2">
            <span className="text-xs font-medium text-muted-foreground px-2">Theme</span>
            <ThemeToggle />
          </div>
          <TrackerLogoutMenu />
        </div>

      </div>
    </aside>
  );
}
