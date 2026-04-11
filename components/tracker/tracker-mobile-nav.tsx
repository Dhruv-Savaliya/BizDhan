"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Drawer } from "vaul";
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
  Menu,
  X,
  LucideIcon
} from "lucide-react";

type NavItem = { href: string; label: string; sub: string | null };

type TrackerMobileNavProps = {
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

export function TrackerMobileNav({
  personalNav,
  smeNav,
  both,
  userName,
  userEmail
}: TrackerMobileNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
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
    <div className="lg:hidden">
      <Drawer.Root open={open} onOpenChange={setOpen}>
        <Drawer.Trigger asChild>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20"
          >
            <AnimatePresence mode="wait">
              {open ? (
                <motion.div
                  key="close"
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: 90 }}
                  transition={{ duration: 0.2 }}
                >
                  <X className="h-6 w-6" />
                </motion.div>
              ) : (
                <motion.div
                  key="menu"
                  initial={{ opacity: 0, rotate: 90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: -90 }}
                  transition={{ duration: 0.2 }}
                >
                  <Menu className="h-6 w-6" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </Drawer.Trigger>

        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 max-h-[75vh] flex flex-col bg-background rounded-t-2xl border-t border-border/50">
            <div className="mx-auto mt-4 h-1.5 w-12 rounded-full bg-muted-foreground/30 mb-6" />
            
            <div className="flex-1 overflow-y-auto p-6 pt-0 pb-10 flex flex-col">
              {/* User Card */}
              <div className="pb-6 border-b border-border/50">
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
                <div className="pt-6">
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
              <div className="pt-6 flex-1 flex flex-col gap-1">
                {displayedNav.map((l) => {
                  const isActive = pathname === l.href;
                  const Icon = getIconForLabel(l.label);

                  return (
                    <Link
                      key={l.href}
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className={`group flex flex-col py-3 px-3 transition-colors ${
                        isActive
                          ? "bg-primary/10 text-primary border-l-2 border-primary rounded-r-xl"
                          : "text-foreground/70 hover:bg-muted hover:text-foreground rounded-xl"
                      }`}
                    >
                      <div className="flex items-center justify-between font-medium text-[15px]">
                        <div className="flex items-center gap-3">
                          <Icon
                            className={`h-4 w-4 ${
                              isActive ? "text-primary" : "text-muted-foreground"
                            }`}
                          />
                          <span>{l.label}</span>
                        </div>
                      </div>
                      {isActive && l.sub && (
                        <div className="pl-7 mt-1 text-[12px] text-muted-foreground/70 leading-snug">
                          {l.sub}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>

              {/* Bottom Section */}
              <div className="pt-8 mt-auto flex flex-col gap-4">
                <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/30 p-3">
                  <span className="text-sm font-medium text-muted-foreground px-2">Theme</span>
                  <ThemeToggle />
                </div>
                <TrackerLogoutMenu />
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
