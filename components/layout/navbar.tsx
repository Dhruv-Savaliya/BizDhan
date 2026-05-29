"use client";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { Menu, ArrowRight, User, LogOut, Settings, ListChecks, Sparkles } from "lucide-react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { NAVBAR } from "@/constants/layout/navbar-constants";
import { UserRole } from "@/types/roles";
import { ThemeToggle } from "@/components/layout/theme-toggle";

const ease = [0.16, 1, 0.3, 1] as const;

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  enabledWorkspaceKinds?: string[];
}

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`relative px-4 py-2 text-sm font-bold transition-colors duration-300 ${
        active ? "text-primary" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
      {active && (
        <motion.div
          layoutId="nav-underline"
          className="absolute bottom-0 left-2 right-2 h-[2px] bg-primary rounded-full shadow-[0_0_10px_rgba(45,212,191,0.5)]"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        />
      )}
    </Link>
  );
}

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Magnetic Logo Ref
  const logoRef = useRef<HTMLAnchorElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 150, damping: 15 });
  const springY = useSpring(y, { stiffness: 150, damping: 15 });

  const handleLogoMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const { left, top, width, height } = logoRef.current?.getBoundingClientRect() || { left: 0, top: 0, width: 0, height: 0 };
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);
    x.set(middleX * 0.2);
    y.set(middleY * 0.2);
  };

  const handleLogoMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const res = await fetch("/api/auth/me", { method: "GET" });
        if (!res.ok) {
          setUser(null);
          return;
        }
        const contentType = res.headers.get("content-type") ?? "";
        const data = contentType.includes("application/json")
          ? ((await res.json()) as { user: User | null })
          : { user: null };
        setUser(data.user);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    checkUser();
  }, []);

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/signout", { method: "POST" });
      if (response.ok) {
        setUser(null);
        if (pathname.startsWith("/user") || pathname.startsWith("/dashboard")) {
          router.push("/");
        }
      }
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const hasPersonal = Boolean(user?.enabledWorkspaceKinds?.includes("personal"));
  const hasSme = Boolean(user?.enabledWorkspaceKinds?.includes("sme"));
  const bothTrackers = hasPersonal && hasSme;
  const smeOnly = hasSme && !hasPersonal;
  const trackerEntryHref = bothTrackers ? "/tracker/income" : smeOnly ? "/tracker/purchase" : "/tracker/income";

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 1, ease }}
      className="fixed top-0 left-0 right-0 z-[100] pointer-events-none"
    >
      <div className="flex justify-center w-full pt-4 md:pt-6">
        <motion.div
          animate={{
            width: scrolled ? "auto" : "95%",
            maxWidth: scrolled ? "850px" : "1400px",
            height: scrolled ? "64px" : "72px",
            borderRadius: scrolled ? "50px" : "24px",
            y: scrolled ? 10 : 0,
            paddingLeft: scrolled ? "clamp(16px, 4vw, 32px)" : "clamp(16px, 4vw, 24px)",
            paddingRight: scrolled ? "clamp(12px, 2vw, 12px)" : "clamp(16px, 4vw, 24px)",
          }}
          transition={{ duration: 0.6, ease }}
          className={`pointer-events-auto flex items-center justify-between transition-all border shadow-2xl ${
            scrolled 
              ? "bg-background/80 dark:bg-[#050508]/80 backdrop-blur-3xl border-border/50 dark:border-white/10 shadow-primary/20 ring-1 ring-border/20 dark:ring-white/10" 
              : "bg-background/5 dark:bg-white/5 backdrop-blur-xl border-border/50 dark:border-white/10 shadow-none"
          }`}
        >
          {/* Logo Section */}
          <motion.div
            style={{ x: springX, y: springY }}
            onMouseMove={handleLogoMouseMove}
            onMouseLeave={handleLogoMouseLeave}
          >
            <Link ref={logoRef} href="/" className="flex items-center gap-3 group">
              <div className="relative w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black shadow-[0_0_30px_rgba(45,212,191,0.5)] overflow-hidden transition-transform group-hover:scale-110">
                <Sparkles className="w-6 h-6" />
                <div className="absolute inset-0 bg-white/30 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </div>
              <div className="flex flex-col leading-none font-black tracking-tight">
                <span className="text-[10px] uppercase opacity-50 tracking-widest text-foreground dark:text-white">BizDhan</span>
                <span className="text-xl text-foreground dark:text-white">
                  {NAVBAR.name.primary}
                  <span className="text-primary">{NAVBAR.name.secondary}</span>
                </span>
              </div>
            </Link>
          </motion.div>

          {/* Desktop Nav Items */}
          <nav className="hidden lg:flex items-center gap-2">
            {NAVBAR.links.map((link) => (
              <NavLink 
                key={link.href} 
                href={link.href} 
                label={link.label} 
                active={pathname === link.href} 
              />
            ))}
            
            <div className="w-px h-6 bg-white/10 mx-4" />

            <ThemeToggle />

            {isLoading ? (
              <div className="w-20 h-10 bg-white/5 rounded-full animate-pulse ml-4" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="rounded-full gap-3 px-1 pr-4 ml-4 bg-muted/50 dark:bg-white/5 hover:bg-muted dark:hover:bg-white/10 border border-border dark:border-white/5 h-10 text-foreground dark:text-white">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-black text-xs">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-black tracking-widest uppercase truncate max-w-[100px]">{user.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72 p-3 bg-[#0A0A0E]/90 backdrop-blur-3xl border-white/10 rounded-[2rem] mt-4 shadow-2xl">
                  <div className="p-5 bg-white/5 rounded-2xl mb-2 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary font-black text-xl">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-base truncate text-white">{user.name}</p>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                  <DropdownMenuItem asChild className="rounded-xl px-4 py-4 cursor-pointer hover:bg-white/5 transition-colors">
                    <Link href="/user" className="flex items-center text-white">
                       <Settings className="w-5 h-5 mr-4 text-primary" />
                       <span className="font-bold">My Account</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-xl px-4 py-4 cursor-pointer hover:bg-white/5 transition-colors">
                    <Link href={trackerEntryHref} className="flex items-center text-white">
                       <ListChecks className="w-5 h-5 mr-4 text-primary" />
                       <span className="font-bold">Finance Trackers</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/5 my-2" />
                  <DropdownMenuItem onClick={handleLogout} className="rounded-xl px-4 py-4 text-rose-500 cursor-pointer hover:bg-rose-500/10 transition-colors">
                    <LogOut className="w-5 h-5 mr-4 text-rose-500" />
                    <span className="font-bold">Terminate Session</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild className="rounded-full bg-primary text-primary-foreground hover:bg-primary/95 font-black h-12 px-8 ml-4 shadow-[0_15px_30px_rgba(45,212,191,0.3)] transition-all hover:scale-105 active:scale-95">
                <Link href="/login">
                  Launch App
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            )}
          </nav>

          {/* Mobile Menu Trigger */}
          <div className="lg:hidden flex items-center gap-2">
            <ThemeToggle />
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full bg-muted/50 dark:bg-white/5 hover:bg-muted dark:hover:bg-white/10 border border-border dark:border-white/5 h-10 w-10">
                    <Menu className="h-5 w-5 text-foreground dark:text-white" />
                  </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full max-w-sm bg-[#050508]/95 backdrop-blur-3xl border-white/10 flex flex-col p-8">
                 <div className="flex items-center gap-3 mb-12">
                   <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground">
                     <Sparkles className="w-6 h-6" />
                   </div>
                   <SheetTitle className="text-3xl font-black text-white">BizDhan</SheetTitle>
                 </div>
                 
                 <nav className="flex flex-col gap-6">
                   {NAVBAR.links.map((link, i) => (
                     <motion.div
                       key={link.href}
                       initial={{ x: 30, opacity: 0 }}
                       animate={{ x: 0, opacity: 1 }}
                       transition={{ delay: i * 0.1 }}
                     >
                       <Link 
                         href={link.href} 
                         onClick={() => setIsOpen(false)}
                         className={`text-4xl font-black tracking-tighter ${pathname === link.href ? 'text-primary' : 'text-white/40 hover:text-white'}`}
                       >
                         {link.label}
                       </Link>
                     </motion.div>
                   ))}
                 </nav>
                 
                 <div className="mt-auto pt-8 border-t border-white/5 flex flex-col gap-4">
                   {user ? (
                     <>
                        <Button asChild className="rounded-2xl h-16 font-black text-xl bg-primary shadow-2xl shadow-primary/20">
                          <Link href="/user" onClick={() => setIsOpen(false)}>My Account</Link>
                        </Button>
                        <div className="grid grid-cols-2 gap-3 pb-2 border-b border-white/5">
                          {bothTrackers || hasPersonal ? (
                            <Link href="/tracker/income" onClick={() => setIsOpen(false)} className="bg-white/5 hover:bg-white/10 rounded-xl p-3 flex flex-col items-center justify-center gap-1 transition-colors">
                               <Sparkles className="w-5 h-5 text-primary" />
                               <span className="text-xs font-bold text-white uppercase tracking-wider">Personal</span>
                            </Link>
                          ) : null}
                          {bothTrackers || hasSme ? (
                            <Link href="/tracker/purchase" onClick={() => setIsOpen(false)} className="bg-white/5 hover:bg-white/10 rounded-xl p-3 flex flex-col items-center justify-center gap-1 transition-colors">
                               <ListChecks className="w-5 h-5 text-fuchsia-500" />
                               <span className="text-xs font-bold text-white uppercase tracking-wider">Business</span>
                            </Link>
                          ) : null}
                          
                          <Link href="/tracker/summary" onClick={() => setIsOpen(false)} className="bg-white/5 hover:bg-white/10 rounded-xl p-3 flex flex-col items-center justify-center gap-1 transition-colors">
                             <ListChecks className="w-5 h-5 text-emerald-500" />
                             <span className="text-xs font-bold text-white uppercase tracking-wider">Summary</span>
                          </Link>
                          <Link href="/tracker/report" onClick={() => setIsOpen(false)} className="bg-white/5 hover:bg-white/10 rounded-xl p-3 flex flex-col items-center justify-center gap-1 transition-colors">
                             <ListChecks className="w-5 h-5 text-blue-500" />
                             <span className="text-xs font-bold text-white uppercase tracking-wider">Report</span>
                          </Link>
                        </div>
                        <Button variant="outline" onClick={() => { handleLogout(); setIsOpen(false); }} className="rounded-2xl h-16 font-black border-white/10 text-rose-500 hover:bg-rose-500/10">
                          Sign Out
                        </Button>
                     </>
                   ) : (
                     <Button asChild className="rounded-[2rem] h-20 font-black text-2xl bg-primary shadow-2xl shadow-primary/30">
                       <Link href="/login" onClick={() => setIsOpen(false)}>Login Now</Link>
                     </Button>
                   )}
                 </div>
              </SheetContent>
            </Sheet>
          </div>
        </motion.div>
      </div>
    </motion.header>
  );
}
