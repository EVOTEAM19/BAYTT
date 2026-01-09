import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";
import { Loader2 } from "lucide-react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-glow hover:shadow-glow-lg hover:bg-primary-hover active:scale-95 focus-visible:ring-primary",
        secondary:
          "bg-transparent text-foreground border-2 border-border hover:border-border-hover hover:bg-card-hover active:scale-95 focus-visible:ring-border-focus",
        ghost:
          "bg-transparent text-foreground hover:bg-card hover:text-foreground active:scale-95 focus-visible:ring-border-focus",
        danger:
          "bg-error text-error-foreground hover:bg-red-600 active:scale-95 focus-visible:ring-error shadow-sm",
        netflix:
          "bg-accent text-accent-foreground hover:bg-accent-hover active:scale-95 focus-visible:ring-accent shadow-sm",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
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
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    const content = isLoading ? (
      <Loader2 className="h-4 w-4 animate-spin" />
    ) : (
      <>
        {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
        {children}
        {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
      </>
    );

    // Si asChild es true, siempre necesitamos envolver en un span para evitar que props se pasen al Fragment
    if (asChild) {
      return (
        <Comp
          ref={ref}
          disabled={disabled || isLoading}
          {...props}
        >
          <span className={cn(buttonVariants({ variant, size, className }))}>
            {content}
          </span>
        </Comp>
      );
    }

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {content}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
