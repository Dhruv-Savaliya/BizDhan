"use client";

import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Sparkles,
  HelpCircle,
} from "lucide-react";

export type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const NAVBAR = {
  logo: {
    light: "/images/logo.svg",
    dark: "/images/logo.svg",
    alt: "Bizdhan Logo",
    width: 32,
    height: 32,
  },
  name: {
    primary: "Bizd",
    secondary: "han",
  },
  links: [
    { href: "/#features", label: "Features", icon: Sparkles },
    { href: "/#faq", label: "FAQ", icon: HelpCircle },
  ] as NavLink[],
} as const;
