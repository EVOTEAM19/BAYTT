"use client";

import * as React from "react";
import { Input, InputProps } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";

interface InputWrapperProps extends Omit<InputProps, "id"> {
  label?: string;
  error?: string;
}

export const InputWrapper = React.forwardRef<HTMLInputElement, InputWrapperProps>(
  ({ label, error, className, ...props }, ref) => {
    const id = label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className={cn("w-full", className)}>
        {label && (
          <Label className="mb-2 block" htmlFor={id}>
            {label}
          </Label>
        )}
        <Input
          ref={ref}
          id={id}
          error={error}
          className={className}
          {...props}
        />
      </div>
    );
  }
);
InputWrapper.displayName = "InputWrapper";

