"use client";

import type { Control, UseFormSetValue, UseFormWatch } from "react-hook-form";
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
import { useCustomerLookupPrefill } from "@/hooks/useCustomerLookupPrefill";
import type { VisitFormValues } from "@/components/forms/VisitForm/VisitForm.types";
import type { FieldSalesFormCopy, FieldSalesFormValues } from "../FieldSalesForm.types";

interface CustomerSectionProps {
  copy: FieldSalesFormCopy;
  control: Control<FieldSalesFormValues>;
  watch: UseFormWatch<FieldSalesFormValues>;
  setValue: UseFormSetValue<FieldSalesFormValues>;
}

export function CustomerSection({ copy, control, watch, setValue }: CustomerSectionProps) {
  const fields = copy.fields;
  const { lookupStatus } = useCustomerLookupPrefill({
    watch: watch as unknown as import("react-hook-form").UseFormWatch<VisitFormValues>,
    setValue: setValue as unknown as import("react-hook-form").UseFormSetValue<VisitFormValues>,
  });

  return (
    <FormSection title={copy.sections.customer} id="section-customer">
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
                  value={field.value ?? ""}
                />
              </FormControl>
              {lookupStatus === "loading" && (
                <p className="text-xs text-text-muted" aria-live="polite">
                  Looking up customer…
                </p>
              )}
              {lookupStatus === "found" && (
                <p className="text-xs text-status-success" aria-live="polite">
                  Existing customer found — details prefilled.
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
                  value={field.value ?? ""}
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
                  {Object.entries(fields.customerType.options).map(([value, label]) => (
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
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField
          control={control}
          name="area"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{fields.area.label}</FormLabel>
              <FormControl>
                <Input
                  placeholder={fields.area.placeholder}
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
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{fields.gender.label}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={fields.gender.placeholder} />
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
                    <SelectValue placeholder={fields.ageGroup.placeholder} />
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
      </div>
    </FormSection>
  );
}
