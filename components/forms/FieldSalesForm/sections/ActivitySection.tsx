"use client";

import type { Control } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormSection } from "@/components/forms/VisitForm/FormSection";
import { DatePicker } from "@/components/shared/DatePicker";
import type { FieldSalesFormCopy, FieldSalesFormValues } from "../FieldSalesForm.types";
import {
  formatTimeForInput,
  parseTimeInput,
} from "../FieldSalesForm.types";

interface ActivitySectionProps {
  copy: FieldSalesFormCopy;
  control: Control<FieldSalesFormValues>;
  totalDurationLabel: string | null;
}

export function ActivitySection({
  copy,
  control,
  totalDurationLabel,
}: ActivitySectionProps) {
  const fields = copy.fields;

  return (
    <FormSection title={copy.sections.activity} id="section-activity">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={control}
          name="activityType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{fields.activityType.label}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(fields.activityType.options).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="locationLabel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{fields.locationLabel.label}</FormLabel>
              <FormControl>
                <Input
                  placeholder={fields.locationLabel.placeholder}
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField
          control={control}
          name="activityDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{fields.activityDate.label}</FormLabel>
              <FormControl>
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="startTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{fields.startTime.label}</FormLabel>
              <FormControl>
                <Input
                  type="time"
                  value={formatTimeForInput(field.value)}
                  onChange={(event) => {
                    field.onChange(parseTimeInput(event.target.value));
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="endTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{fields.endTime.label}</FormLabel>
              <FormControl>
                <Input
                  type="time"
                  value={formatTimeForInput(field.value)}
                  onChange={(event) => {
                    if (!event.target.value) {
                      field.onChange(undefined);
                      return;
                    }
                    field.onChange(parseTimeInput(event.target.value));
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {totalDurationLabel && (
        <p className="text-sm text-text-secondary">
          {fields.totalDuration.label}:{" "}
          <span className="font-medium text-text-primary">{totalDurationLabel}</span>
        </p>
      )}
    </FormSection>
  );
}
