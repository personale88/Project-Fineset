"use client";

import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useStoreCategoryChoices } from "@/hooks/useStoreCategoryChoices";
import type { ControllerRenderProps, FieldValues, Path } from "react-hook-form";

interface StoreCategorySelectProps<TFieldValues extends FieldValues> {
  field: ControllerRenderProps<TFieldValues, Path<TFieldValues>>;
  label: string;
  disabled?: boolean;
}

export function StoreCategorySelect<TFieldValues extends FieldValues>({
  field,
  label,
  disabled = false,
}: StoreCategorySelectProps<TFieldValues>) {
  const { data: choices = [], isLoading, isError } = useStoreCategoryChoices();

  return (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      {isLoading ? (
        <Skeleton className="h-10 w-full rounded-input" />
      ) : (
        <Select
          onValueChange={field.onChange}
          value={field.value ? String(field.value) : undefined}
          disabled={disabled || isError}
        >
          <FormControl>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            {choices.map((choice) => (
              <SelectItem key={choice.name} value={choice.name}>
                {choice.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <FormMessage />
    </FormItem>
  );
}
