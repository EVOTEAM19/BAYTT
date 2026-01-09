"use client";

import * as React from "react";
import { Textarea, TextareaProps } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";

interface TextareaWrapperProps extends TextareaProps {
  label?: string;
  error?: string;
}

export const TextareaWrapper = React.forwardRef<
  HTMLTextAreaElement,
  TextareaWrapperProps
>(({ label, error, className, ...props }, ref) => {
  const id = label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <Label className="mb-2 block" htmlFor={id}>
          {label}
        </Label>
      )}
      <Textarea ref={ref} id={id} error={error} className={className} {...props} />
    </div>
  );
});
TextareaWrapper.displayName = "TextareaWrapper";

