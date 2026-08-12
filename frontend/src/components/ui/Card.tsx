import type { HTMLAttributes } from "react";

export type CardVariant = "default" | "subtle" | "interactive" | "highlighted" | "muted" | "dark";
export type CardPadding = "none" | "sm" | "md" | "lg";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding;
  variant?: CardVariant;
}

const variantClasses: Record<CardVariant, string> = {
  default: "bg-surface border border-border rounded-card shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
  subtle: "bg-canvas border border-border rounded-card",
  interactive:
    "bg-surface border border-border rounded-card shadow-[0_1px_2px_rgba(0,0,0,0.04)] cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:border-secondary/30 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]",
  highlighted: "bg-accent-soft border border-accent/20 rounded-card",
  muted: "bg-muted border border-border rounded-card",
  dark: "bg-ink border border-ink rounded-card text-white",
};

const paddingClasses: Record<CardPadding, string> = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export default function Card({
  variant = "default",
  padding = "md",
  className = "",
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={`${variantClasses[variant]} ${paddingClasses[padding]} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}