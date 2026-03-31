export const PERSONAL_TRACKER_NAV = [
  { href: "/tracker/income", label: "Income", sub: null as string | null },
  { href: "/tracker/expense", label: "Expense", sub: null },
  { href: "/tracker/invest", label: "Invest", sub: "Expense − income" },
  { href: "/tracker/report", label: "Report", sub: null },
] as const;
