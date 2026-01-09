"use client"

import * as React from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils/cn"

interface SelectWrapperProps {
  label?: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
  placeholder?: string
  disabled?: boolean
  error?: string
  className?: string
}

export function SelectWrapper({
  label,
  value,
  onChange,
  options,
  placeholder = "Seleccionar...",
  disabled = false,
  error,
  className,
}: SelectWrapperProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label className={cn(error && "text-error")}>
          {label}
        </Label>
      )}
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className={cn(error && "border-error")}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && (
        <p className="text-sm text-error">{error}</p>
      )}
    </div>
  )
}
