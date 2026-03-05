"use client"

import * as React from "react"
import { Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type SelectableRowProps = {
  selected: boolean
  onToggle: () => void
  disabled?: boolean
  children: React.ReactNode
  className?: string
  indicatorClassName?: string
}

// Wiederverwendbare "checked row" reduziert duplizierte Toggle-UI in Goals/Session-Forms.
export function SelectableRow({
  selected,
  onToggle,
  disabled,
  children,
  className,
  indicatorClassName,
}: SelectableRowProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "h-auto justify-start gap-2 px-3 py-2.5 text-left text-sm font-normal transition-colors",
        selected ? "bg-primary/10" : "bg-background/10 hover:bg-muted/20",
        className
      )}
    >
      <span
        className={cn(
          "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
          selected
            ? "bg-primary text-primary-foreground"
            : "border border-border/60 bg-background/20 text-muted-foreground/40",
          indicatorClassName
        )}
      >
        <Check className={cn("h-3.5 w-3.5", selected ? "opacity-100" : "opacity-0")} />
      </span>
      <span className="leading-5">{children}</span>
    </Button>
  )
}
