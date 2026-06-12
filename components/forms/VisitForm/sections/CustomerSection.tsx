"use client";

import type { Control } from "react-hook-form";
import { useFormContext } from "react-hook-form";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { calculateDurationMins, formatDurationMins } from "@/lib/utils/formatters";
import { useCustomerLookupPrefill } from "@/hooks/useCustomerLookupPrefill";
import { DatePicker } from "@/components/shared/DatePicker";
import { FormSection } from "../FormSection";
import type { VisitFormCopy, VisitFormValues } from "../VisitForm.types";
import {
  formatTimeForInput,
  parseTimeInput,
} from "../VisitForm.types";

interface CustomerSectionProps {
  copy: VisitFormCopy;
  control: Control<VisitFormValues>;
  visitDate: Date | undefined;
  inTime: Date | undefined;
  outTime: Date | undefined;
}

export function CustomerSection({
  copy,
  control,
  visitDate,
  inTime,
  outTime,
}: CustomerSectionProps) {
  const fields = copy.fields;
  const { setValue, watch } = useFormContext<VisitFormValues>();
  const { lookupStatus } = useCustomerLookupPrefill({ watch, setValue });
  const timeBase = visitDate ?? new Date();

  const totalDurationLabel =
    inTime && outTime && outTime > inTime
      ? formatDurationMins(calculateDurationMins(inTime, outTime))
      : null;

  return (
    <FormSection title={copy.sections.customer} id="section-customer">
      <FormField
        control={control}
        name="visitDate"
        render={({ field }) => (
          <FormItem className="max-w-xs">
            <FormLabel>{fields.saleDate.label}</FormLabel>
            <FormControl>
              <DatePicker
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                placeholder={fields.saleDate.placeholder}
                toDate={new Date()}
                captionLayout="dropdown"
                fromYear={2020}
                toYear={new Date().getFullYear()}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={control}
          name="customerPhone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{fields.phone.label}</FormLabel>
              <FormControl>
                <Input
                  placeholder={fields.phone.placeholder}
                  inputMode="numeric"
                  maxLength={10}
                  autoComplete="off"
                  {...field}
                />
              </FormControl>
              {lookupStatus === "loading" && (
                <p className="text-xs text-text-muted" aria-live="polite">
                  {fields.lookingUpCustomer}
                </p>
              )}
              {lookupStatus === "found" && (
                <p className="text-xs text-status-success" aria-live="polite">
                  {fields.existingCustomerHint}
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="customerName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{fields.customerName.label}</FormLabel>
              <FormControl>
                <Input
                  placeholder={fields.customerName.placeholder}
                  autoComplete="off"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={control}
          name="customerType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{fields.customerType.label}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(fields.customerType.options).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="visitType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{fields.visitType.label}</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="flex gap-4 pt-1"
                >
                  {Object.entries(fields.visitType.options).map(
                    ([value, label]) => (
                      <div key={value} className="flex items-center gap-2">
                        <RadioGroupItem value={value} id={`visit-type-${value}`} />
                        <Label htmlFor={`visit-type-${value}`}>{label}</Label>
                      </div>
                    ),
                  )}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField
          control={control}
          name="inTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{fields.inTime.label}</FormLabel>
              <FormControl>
                <Input
                  type="time"
                  value={field.value ? formatTimeForInput(field.value) : ""}
                  onChange={(event) => {
                    field.onChange(parseTimeInput(event.target.value, timeBase));
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="outTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{fields.outTime.label}</FormLabel>
              <FormControl>
                <Input
                  type="time"
                  value={field.value ? formatTimeForInput(field.value) : ""}
                  onChange={(event) => {
                    if (!event.target.value) {
                      field.onChange(undefined);
                      return;
                    }
                    field.onChange(
                      parseTimeInput(event.target.value, inTime ?? timeBase),
                    );
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormItem>
          <FormLabel>{fields.totalDuration.label}</FormLabel>
          <div className="flex h-12 items-center rounded-input border border-border bg-surface-secondary px-3 text-sm text-text-primary">
            {totalDurationLabel ?? "—"}
          </div>
        </FormItem>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={control}
          name="sourceChannel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{fields.sourceChannel.label}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(fields.sourceChannel.options).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FormField
          control={control}
          name="area"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{fields.area.label}</FormLabel>
              <FormControl>
                <Input placeholder={fields.area.placeholder} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{fields.gender.label}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(fields.gender.options).map(([value, label]) => (
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
          name="ageGroup"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{fields.ageGroup.label}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(fields.ageGroup.options).map(([value, label]) => (
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
          name="dateOfBirth"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{fields.dateOfBirth.label}</FormLabel>
              <FormControl>
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder={fields.dateOfBirth.placeholder}
                  toDate={new Date()}
                  captionLayout="dropdown"
                  fromYear={1920}
                  toYear={new Date().getFullYear()}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={control}
          name="address"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>{fields.address.label}</FormLabel>
              <FormControl>
                <Input
                  placeholder={fields.address.placeholder}
                  autoComplete="street-address"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="profession"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{fields.profession.label}</FormLabel>
              <FormControl>
                <Input
                  placeholder={fields.profession.placeholder}
                  autoComplete="off"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="anniversary"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{fields.anniversary.label}</FormLabel>
              <FormControl>
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder={fields.anniversary.placeholder}
                  toDate={new Date()}
                  captionLayout="dropdown"
                  fromYear={1950}
                  toYear={new Date().getFullYear()}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </FormSection>
  );
}
