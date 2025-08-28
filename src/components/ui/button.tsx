import * as React from "react"
import { cn } from "@/lib/utils"

type Variant = "default" | "secondary" | "ghost"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

const classes: Record<Variant, string> = {
  default: "bg-slate-900 text-white hover:opacity-90",
  secondary: "bg-white border hover:bg-slate-50",
  ghost: "bg-transparent hover:bg-slate-100",
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant="default", ...props }, ref) => (
    <button ref={ref} className={cn("inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-xl", classes[variant], className)} {...props} />
  )
)
Button.displayName = "Button"
