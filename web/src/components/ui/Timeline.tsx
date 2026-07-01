import React from "react";
import { cn } from "@/lib/utils";
import { Check, Clock, Package, ChefHat, Truck } from "lucide-react";

export type OrderStatus = "placed" | "confirmed" | "preparing" | "out_for_delivery" | "delivered";

const STATUS_STAGES: {
  status: OrderStatus;
  label: string;
  icon: React.ElementType;
}[] = [
  { status: "placed", label: "Placed", icon: Clock },
  { status: "confirmed", label: "Confirmed", icon: Check },
  { status: "preparing", label: "Preparing", icon: ChefHat },
  { status: "out_for_delivery", label: "Out for Delivery", icon: Truck },
  { status: "delivered", label: "Delivered", icon: Package },
];

export interface TimelineProps {
  currentStatus: OrderStatus;
  className?: string;
  orientation?: "horizontal" | "vertical";
}

export function Timeline({
  currentStatus,
  className,
  orientation = "horizontal",
}: TimelineProps) {
  const currentIndex = STATUS_STAGES.findIndex(
    (s) => s.status === currentStatus
  );

  return (
    <div
      className={cn(
        "flex w-full",
        orientation === "horizontal"
          ? "flex-row items-center justify-between"
          : "flex-col space-y-4",
        className
      )}
    >
      {STATUS_STAGES.map((stage, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const Icon = stage.icon;

        return (
          <div
            key={stage.status}
            className={cn(
              "relative flex flex-1 items-center",
              orientation === "vertical" ? "flex-row" : "flex-col"
            )}
          >
            {/* Connecting Line */}
            {index !== STATUS_STAGES.length - 1 && (
              <div
                className={cn(
                  "absolute bg-muted transition-colors duration-500",
                  orientation === "horizontal"
                    ? "top-5 h-[2px] w-full left-[50%]"
                    : "left-5 top-10 h-full w-[2px]",
                  isCompleted ? "bg-status-success" : "bg-muted/30"
                )}
              />
            )}

            {/* Icon Bubble */}
            <div
              className={cn(
                "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-500",
                isCompleted
                  ? "border-status-success bg-status-success text-bg"
                  : isCurrent
                  ? "border-accent bg-accent text-bg animate-pulse shadow-[0_0_15px_rgba(240,116,90,0.5)]"
                  : "border-muted/30 bg-bg text-muted"
              )}
            >
              <Icon className="h-5 w-5" />
            </div>

            {/* Label */}
            <div
              className={cn(
                "mt-2 text-center text-sm font-medium transition-colors duration-500",
                orientation === "horizontal" ? "mt-2" : "ml-4 mt-0 text-left",
                isCompleted || isCurrent ? "text-ink" : "text-muted"
              )}
            >
              {stage.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
