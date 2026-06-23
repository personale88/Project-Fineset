import type { Control } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { DatePicker } from "@/components/shared/DatePicker";
import { TimePicker } from "@/components/shared/TimePicker";
import { FormSection } from "../FormSection";
import type { VisitFormCopy, VisitFormValues } from "../VisitForm.types";

interface FollowUpSectionProps {
  copy: VisitFormCopy;
  control: Control<VisitFormValues>;
  followUpNeeded: boolean;
}

export function FollowUpSection({
  copy,
  control,
  followUpNeeded,
}: FollowUpSectionProps) {
  const fields = copy.fields;

  return (
    <FormSection title={copy.sections.followUp} id="section-follow-up">
      <FormField
        control={control}
        name="followUpNeeded"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between gap-4 rounded-input border border-border px-4 py-3 sm:max-w-md">
            <FormLabel className="mt-0">{fields.followUpNeeded.label}</FormLabel>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />

      {followUpNeeded && (
        <div className="grid gap-4 sm:max-w-2xl sm:grid-cols-2">
          <FormField
            control={control}
            name="followUpDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{fields.followUpDate.label}</FormLabel>
                <FormControl>
                  <DatePicker
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder={fields.followUpDate.placeholder}
                    fromDate={new Date()}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="followUpPreferredTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{fields.followUpTime.label}</FormLabel>
                <FormControl>
                  <TimePicker
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                </FormControl>
                <p className="text-xs text-text-muted">{fields.followUpTime.hint}</p>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}

      <FormField
        control={control}
        name="staffNotes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{fields.staffNotes.label}</FormLabel>
            <FormControl>
              <Textarea
                placeholder={fields.staffNotes.placeholder}
                maxLength={500}
                rows={4}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </FormSection>
  );
}
