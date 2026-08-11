import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

// Pill geometry, one accent, no gradients. Press feedback is a small scale on
// :active — the iOS cue — rather than a hover glow.
const buttonVariants = cva(
  [
    "cursor-pointer relative z-0 isolate inline-flex items-center justify-center gap-2",
    "rounded-md whitespace-nowrap font-medium tracking-[-0.01em]",
    "transition-[background-color,color,box-shadow,transform,border-color] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
    "active:scale-[0.97] active:duration-100",
    "disabled:pointer-events-none disabled:opacity-45",
    "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_1px_2px_var(--tw-shadow-color,rgba(0,0,0,0.12)),inset_0_1px_0_0_rgba(255,255,255,0.22)] hover:brightness-110",
        destructive:
          "bg-destructive text-primary-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.22)] hover:brightness-110",
        outline:
          "border border-border bg-transparent text-foreground hover:bg-foreground/[0.045] hover:border-foreground/25",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-foreground/[0.08]",
        ghost:
          "text-foreground/75 hover:text-foreground hover:bg-foreground/[0.055]",
        link: "rounded-none text-primary underline-offset-4 hover:underline active:scale-100",
        // Liquid glass — the surface picks up whatever sits behind it.
        cta: "bg-primary text-primary-foreground glass glass-sheen glass-interactive rounded-md shadow-[0_1px_2px_var(--tw-shadow-color,rgba(0,0,0,0.12)),inset_0_1px_0_0_rgba(255,255,255,0.22)] hover:brightness-110 ",
        ctaSoft:
          "glass rounded-md text-foreground shadow-[0_1px_2px_var(--tw-shadow-color,rgba(0,0,0,0.12)),inset_0_1px_0_0_rgba(255,255,255,0.22)] hover:brightness-110 hover:bg-[var(--glass-bg-strong)]",
      },
      size: {
        default: "h-10 px-5 text-sm has-[>svg]:pr-4",
        sm: "h-8 px-3.5 text-[0.8125rem] gap-1.5",
        lg: "h-11 px-6 text-[0.9375rem]",
        xl: "h-13 px-7 text-base",
        icon: "size-10 px-0",
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
  const classes = cn(buttonVariants({ variant, size, fullWidth }), className)

  if (asChild) {
    // Ensure there's exactly one child element when using `asChild`.
    const child = React.Children.only(children) as React.ReactElement
    const childClass = cn((child.props && child.props.className) || '', classes)
    const mergedProps = { ...props, className: childClass, disabled: disabled || isLoading }

    const inner = (
      <>
        {isLoading && (
          <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {Icon && !isLoading && <Icon className="size-4" />}
        {child.props && child.props.children}
      </>
    )

    return React.cloneElement(child, mergedProps, inner)
  }

  return (
    <button
      data-slot="button"
      className={classes}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {Icon && !isLoading && <Icon className="size-4" />}
      {children}
    </button>
  )
}

export { Button, buttonVariants }
