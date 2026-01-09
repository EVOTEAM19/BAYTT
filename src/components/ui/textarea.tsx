import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, leftIcon, rightIcon, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-3 text-foreground-muted">
              {leftIcon}
            </div>
          )}
          <textarea
            className={cn(
              "flex min-h-[80px] w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted",
              "transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-border-focus focus:border-border-focus focus:shadow-glow",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "resize-none",
              error && "border-error focus:ring-error",
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              className
            )}
            ref={ref}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-3 text-foreground-muted">
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
Textarea.displayName = "Textarea";

export { Textarea };
