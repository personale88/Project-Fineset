"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  value?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  placeholder?: string;
}

export function TimePicker({
  value = "",
  onChange,
  onBlur,
  disabled = false,
  className,
  id,
  placeholder = "Select time",
}: TimePickerProps) {
  return (
    <Input
      id={id}
      type="time"
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      className={cn("bg-background", className)}
      onBlur={onBlur}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
