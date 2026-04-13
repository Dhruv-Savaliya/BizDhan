import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import type { VariantProps } from "class-variance-authority";
import type { buttonVariants } from "@/components/ui/button";

export type AnimatedInputProps = {
  id: string;
  label: string;
  isTextarea?: boolean;
} & (
  | InputHTMLAttributes<HTMLInputElement>
  | TextareaHTMLAttributes<HTMLTextAreaElement>
);

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

