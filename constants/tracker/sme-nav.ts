export const SME_TRACKER_NAV = [
  { href: "/tracker/dashboard", label: "Dashboard", sub: "Overview" },
  { href: "/tracker/purchase", label: "Purchase", sub: "Inventory" },
  { href: "/tracker/invoice", label: "Invoice", sub: "Bills" },
  { href: "/tracker/income", label: "Income", sub: "Profit" },
  {
    href: "/tracker/expense",
    label: "Expense",
    sub: "Rent, marketing, store",
  },
  { href: "/tracker/summary", label: "Summary", sub: "Runway, health, leaks" },
  { href: "/tracker/report", label: "Report", sub: "AI summary" },
  { href: "/tracker/profile", label: "Profile", sub: "Settings & account" },
] as const;
