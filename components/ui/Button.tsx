import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(

  "cursor-pointer relative z-0 rounded-[10px] transition-all duration-300 ease-in-out shadow-lg inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default: [
          "bg-gradient-to-r from-gray-200 to-gray-100",   // default light gradient
          "dark:from-gray-700 dark:to-gray-600",     // default dark gradient
          "text-gray-800 dark:text-white",
          "border border-gray-400/60 dark:border-gray-700", // Add a small border in light mode
        ].join(" "),        
        destructive:
          "bg-destructive/60 hover:bg-destructive/90 text-white shadow-xs focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
        cta:
          "glow-on-hover bg-gradient-to-r from-gray-200 to-gray-100 dark:from-gray-700 dark:to-gray-600 text-black dark:text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.99] transition-transform before:absolute before:inset-0 before:bg-white/10 before:opacity-0 hover:before:opacity-100",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      fullWidth: false,
    },
  }
)

interface ButtonProps extends React.ComponentProps<"button">,
  VariantProps<typeof buttonVariants> {
    asChild?: boolean
    icon?: LucideIcon
    isLoading?: boolean
    fullWidth?: boolean
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  icon: Icon,
  isLoading = false,
  fullWidth = false,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, fullWidth, className }))}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {Icon && !isLoading && <Icon className="size-4" />}
      {children}
    </Comp>
  )
}

export { Button, buttonVariants }
