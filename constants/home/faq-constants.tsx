"use client";

export const FAQ_CONTENT = {
  id: "faq",
  eyebrow: "FAQ",
  title: "Frequently asked questions",
  description:
    "Everything you need to know about Bizdhan. Can't find an answer? Reach out to our support team.",
  items: [
    {
      question: "What's the difference between Personal and SME mode?",
      answer:
        "Personal mode gives you income/expense tracking, investment monitoring, and budgeting tools. SME mode adds invoicing, purchase tracking, customer ledgers, and financial reports. Choose both at signup to get everything.",
    },
    {
      question: "Can I switch between workspaces later?",
      answer:
        "If you signed up with 'Both' mode, you can seamlessly switch between Personal and SME workspaces from the tracker sidebar. If you started with just one, contact support to enable the other.",
    },
    {
      question: "Is my financial data secure?",
      answer:
        "Absolutely. We use HttpOnly JWT cookies, server-side auth checks, encrypted database connections, and follow security best practices. Your data is never shared with third parties.",
    },
    {
      question: "How does the AI report generation work?",
      answer:
        "Bizdhan uses AI to analyze your income, expense, and investment patterns, then generates plain-language reports with actionable insights like cash runway predictions and expense leak detection.",
    },
    {
      question: "Is Bizdhan free to use?",
      answer:
        "Yes, Bizdhan is free to get started with core features including income/expense tracking, investments, and basic reports. Premium features may be added in the future.",
    },
    {
      question: "Can I export my data?",
      answer:
        "Yes. You can generate PDF reports and invoice documents directly from the tracker. All your data is accessible through the dashboard at any time.",
    },
  ],
} as const;
