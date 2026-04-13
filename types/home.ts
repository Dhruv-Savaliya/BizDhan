import type { ReactNode } from "react";
import type { VariantProps } from "class-variance-authority";
import type { buttonVariants } from "@/components/ui/button";

export interface HomeFaqItem {
  question: string;
  answer: string;
}

export type HomeMagneticButtonProps = {
  children: ReactNode;
  className?: string;
  asChild?: boolean;
  href?: string;
} & VariantProps<typeof buttonVariants>;

