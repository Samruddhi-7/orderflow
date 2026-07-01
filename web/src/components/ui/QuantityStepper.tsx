import React from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
}

export function QuantityStepper({
  value,
  onChange,
  min = 0,
  max = 99,
  className,
}: QuantityStepperProps) {
  const handleDecrement = () => {
    if (value > min) {
      onChange(value - 1);
    }
  };

  const handleIncrement = () => {
    if (value < max) {
      onChange(value + 1);
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button
        type="button"
        onClick={handleDecrement}
        disabled={value <= min}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/20 text-ink hover:bg-muted/40 disabled:opacity-50 disabled:pointer-events-none transition-colors"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="w-6 text-center font-mono text-base font-medium">
        {value}
      </span>
      <button
        type="button"
        onClick={handleIncrement}
        disabled={value >= max}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-ink hover:bg-accent-soft/80 disabled:opacity-50 disabled:pointer-events-none transition-colors"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
