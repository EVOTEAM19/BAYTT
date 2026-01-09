import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { Eye, EyeOff } from "lucide-react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: string;
  showPasswordToggle?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      leftIcon,
      rightIcon,
      error,
      showPasswordToggle = false,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const inputType =
      showPasswordToggle && type === "password"
        ? showPassword
          ? "text"
          : "password"
        : type;

    return (
      <div className="w-full">
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted">
              {leftIcon}
            </div>
          )}
          <input
            type={inputType}
            className={cn(
              "flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted",
              "transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-border-focus focus:border-border-focus focus:shadow-glow",
              "disabled:cursor-not-allowed disabled:opacity-50",
              error && "border-error focus:ring-error",
              leftIcon && "pl-10",
              (rightIcon || showPasswordToggle) && "pr-10",
              className
            )}
            ref={ref}
            {...props}
          />
          {showPasswordToggle && type === "password" && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground transition-colors"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          )}
          {rightIcon && !showPasswordToggle && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1 text-sm text-error">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
