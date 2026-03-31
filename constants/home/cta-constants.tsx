import {
  CalendarCheck,
  BarChart3,
  Shield,
  Zap,
  LucideIcon,
} from "lucide-react";

export interface CTABadge {
  text: string;
}

export interface CTAHeading {
  title: string;
  subtitle: string;
}

export interface CTAFeature {
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface CTAButton {
  text: string;
  href: string;
  variant: "primary" | "secondary";
}

export interface DashboardItem {
  icon: LucideIcon;
  title: string;
  time: string;
  content: string;
}

export interface CTADashboard {
  title: string;
  patientName: string;
  items: DashboardItem[];
}

export interface CTAConfig {
  badge: CTABadge;
  heading: CTAHeading;
  features: CTAFeature[];
  buttons: CTAButton[];
  dashboard: CTADashboard;
}

export const ctaConfig: CTAConfig = {
  badge: {
    text: "Start in 60 seconds",
  },
  heading: {
    title: "Ready to take control of your finances?",
    subtitle:
      "Join thousands of individuals and businesses who trust Bizdhan to manage their money smarter.",
  },
  features: [
    {
      icon: CalendarCheck,
      title: "Quick onboarding",
      description: "Choose Personal, SME, or Both at signup — we set up the right workspace instantly.",
    },
    {
      icon: Shield,
      title: "Bank-grade security",
      description: "End-to-end encryption, server-side auth checks, and audit-friendly history.",
    },
  ],
  buttons: [
    {
      text: "Create free account",
      href: "/signup",
      variant: "primary",
    },
    {
      text: "View a demo",
      href: "/#features",
      variant: "secondary",
    },
  ],
  dashboard: {
    title: "Quick overview",
    patientName: "Dashboard",
    items: [
      {
        icon: CalendarCheck,
        title: "Income logged",
        time: "2 min ago",
        content: "₹45,000 from freelance project — categorized as business income.",
      },
      {
        icon: BarChart3,
        title: "Investment update",
        time: "1h ago",
        content: "Portfolio up 3.2% this month. ₹12,500 returns on mutual funds.",
      },
      {
        icon: Zap,
        title: "Expense alert",
        time: "Today",
        content: "Food & dining spending is 20% above your monthly budget target.",
      },
    ],
  },
};
