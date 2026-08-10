import type { ComponentPropsWithoutRef, Ref } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonProps extends ComponentPropsWithoutRef<"button"> {
  variant?: ButtonVariant;
  ref?: Ref<HTMLButtonElement>;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-ink text-white hover:bg-[#3A3A3C] focus-visible:outline-accent",
  secondary:
    "bg-surface border border-border text-ink hover:bg-canvas focus-visible:outline-accent",
  ghost:
    "bg-transparent text-secondary hover:bg-canvas hover:text-ink focus-visible:outline-accent",
  danger:
    "bg-danger text-white hover:bg-[#FF453A] focus-visible:outline-danger",
};

const baseClasses =
  "inline-flex h-11 items-center justify-center gap-2 rounded-control px-5 text-sm font-medium transition-colors duration-150 select-none disabled:pointer-events-none disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

export default function Button({
  variant = "primary",
  className = "",
  type = "button",
  ref,
  ...rest
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...rest}
    />
  );
}