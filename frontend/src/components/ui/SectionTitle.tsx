import type { ReactNode } from "react";

export interface SectionTitleProps {
  title: string;
  description?: string;
  action?: ReactNode;
  variant?: "default" | "highlighted";
  className?: string;
}

export default function SectionTitle({
  title,
  description,
  action,
  variant = "default",
  className = "",
}: SectionTitleProps) {
  return (
    <div
      className={`flex flex-col gap-3 md:flex-row md:items-center md:justify-between ${className}`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {variant === "highlighted" ? (
            <span aria-hidden className="h-5 w-1 shrink-0 rounded-full bg-accent" />
          ) : null}
          <h2 className="text-h3 md:text-h2 text-ink">{title}</h2>
        </div>
        {description ? (
          <p className="mt-1 text-caption leading-relaxed text-secondary">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}