"use client";

import * as React from "react";
import { endOfDay, startOfDay } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils/formatters";

interface DatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  fromDate?: Date;
  toDate?: Date;
  className?: string;
  id?: string;
  onBlur?: () => void;
  captionLayout?: React.ComponentProps<typeof Calendar>["captionLayout"];
  fromYear?: number;
  toYear?: number;
  allowClear?: boolean;
  clearLabel?: string;
  invalid?: boolean;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  disabled = false,
  fromDate,
  toDate,
  className,
  id,
  onBlur,
  captionLayout = "label",
  fromYear,
  toYear,
  allowClear = false,
  clearLabel = "Clear date",
  invalid = false,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const calendarDisabled = React.useMemo(() => {
    if (fromDate && toDate) {
      return {
        before: startOfDay(fromDate),
        after: endOfDay(toDate),
      };
    }
    if (fromDate) {
      return { before: startOfDay(fromDate) };
    }
    if (toDate) {
      return { after: endOfDay(toDate) };
    }
    return undefined;
  }, [fromDate, toDate]);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) {
            onBlur?.();
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-invalid={invalid || undefined}
            className={cn(
              "h-11 min-w-0 flex-1 justify-start rounded-input border-border bg-surface-card px-3 text-left font-normal hover:bg-surface-card",
              !value && "text-text-muted",
              invalid && "border-status-error ring-1 ring-status-error/30",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-brand-gold" />
            {value ? formatDate(value) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(date) => {
              onChange(date);
              setOpen(false);
            }}
            defaultMonth={value}
            disabled={calendarDisabled}
            captionLayout={captionLayout}
            startMonth={fromYear !== undefined ? new Date(fromYear, 0) : undefined}
            endMonth={toYear !== undefined ? new Date(toYear, 11) : undefined}
          />
        </PopoverContent>
      </Popover>
      {allowClear && value ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11 shrink-0"
          aria-label={clearLabel}
          onClick={() => {
            onChange(undefined);
            onBlur?.();
          }}
        >
          <X className="h-4 w-4" aria-hidden />
        </Button>
      ) : null}
    </div>
  );
}
