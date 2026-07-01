import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label className="text-sm font-medium text-ink/80">{label}</label>
        )}
        <input
          ref={ref}
          className={cn(
            "flex h-11 w-full rounded-xl border border-muted bg-bg px-3 py-2 text-sm text-ink placeholder:text-muted/80 transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-status-error focus:ring-status-error",
            className
          )}
          {...props}
        />
        {error && (
          <span className="text-sm text-status-error mt-0.5">{error}</span>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
