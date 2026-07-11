import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

type ButtonLoadingState = {
  loading?: boolean;
  loadingText?: string;
};

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-[clamp(0.95rem,1.5vw,1.05rem)] font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 min-h-[48px] min-w-[48px] relative overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-br from-primary/90 to-primary text-primary-foreground shadow-lg shadow-primary/20 dark:shadow-primary/10 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/30 dark:hover:shadow-primary/20 active:scale-[0.98] before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700",
        destructive:
          "bg-gradient-to-br from-destructive/90 to-destructive text-destructive-foreground shadow-lg shadow-destructive/20 dark:shadow-destructive/10 hover:scale-[1.02] hover:shadow-xl hover:shadow-destructive/30 dark:hover:shadow-destructive/20 active:scale-[0.98]",
        outline:
          "border-2 border-input/80 bg-background/80 backdrop-blur-sm shadow-inner hover:border-primary/50 hover:bg-accent/10 hover:text-accent-foreground active:scale-[0.98]",
        secondary:
          "bg-gradient-to-br from-secondary/90 to-secondary text-secondary-foreground shadow-lg shadow-secondary/20 dark:shadow-secondary/10 hover:scale-[1.02] hover:shadow-xl hover:shadow-secondary/30 dark:hover:shadow-secondary/20 active:scale-[0.98]",
        ghost:
          "hover:bg-accent/10 hover:text-accent-foreground active:scale-[0.98]",
        link: "text-primary underline-offset-4 hover:underline active:text-primary/80",
        cosmic:
          "bg-gradient-to-br from-[#00D4FF] to-[#7B6FFF] text-white shadow-lg shadow-[#00D4FF]/20 dark:shadow-[#00D4FF]/10 hover:scale-[1.02] hover:shadow-xl hover:shadow-[#00D4FF]/30 active:scale-[0.98] border border-[#00D4FF]/20 before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/15 before:to-transparent before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700",
        "cosmic-outline":
          "border-2 border-[#00D4FF]/30 bg-transparent text-[#00D4FF] hover:bg-[#00D4FF]/10 hover:border-[#00D4FF]/50 active:scale-[0.98] shadow-lg shadow-[#00D4FF]/5",
        wallet:
          "bg-gradient-to-r from-[#4e3bff] to-[#9747ff] text-white shadow-lg shadow-purple-500/20 hover:opacity-90 hover:shadow-purple-500/40 active:scale-[0.98] transition-opacity",
        "wallet-outline":
          "bg-[#4e3bff]/20 border border-[#4e3bff]/40 text-white hover:bg-[#4e3bff]/30 active:scale-[0.98]",
        "danger-ghost":
          "text-red-400 hover:bg-red-500/10 hover:text-red-300 active:scale-[0.98]",
        glow:
          "bg-[#0D1117] text-[#00D4FF] border border-[#00D4FF]/30 shadow-[0_0_15px_rgba(0,212,255,0.15)] hover:shadow-[0_0_30px_rgba(0,212,255,0.25)] hover:border-[#00D4FF]/50 active:scale-[0.98]",
      },
      size: {
        default:
          "h-12 px-6 py-3 min-h-[48px] min-w-[48px]",
        sm: "h-10 rounded-lg px-4 text-xs min-h-[40px] min-w-[40px]",
        lg: "h-14 rounded-xl px-8 text-base min-h-[56px] min-w-[56px]",
        xl: "h-16 rounded-2xl px-10 text-lg min-h-[64px] min-w-[64px]",
        icon: "h-12 w-12 min-h-[48px] min-w-[48px]",
        pill: "h-10 rounded-full px-6 py-2 min-h-[40px] min-w-[40px] text-sm",
        "pill-lg": "h-12 rounded-full px-8 py-3 min-h-[48px] min-w-[48px] text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants>,
    ButtonLoadingState {
  asChild?: boolean;
  children?: React.ReactNode;
  /** Indicates a toggle button's pressed state */
  pressed?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      loadingText,
      children,
      pressed,
      disabled,
      "aria-label": ariaLabel,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    const isDisabled = loading || disabled;

    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size, className }),
          loading && "cursor-wait opacity-80",
          isDisabled && "opacity-50 pointer-events-none"
        )}
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        aria-disabled={isDisabled || undefined}
        aria-pressed={pressed}
        aria-label={ariaLabel}
        {...props}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="sr-only">Loading</span>
            {loadingText || children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
