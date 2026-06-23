"use client";

import { DatePicker } from "@/components/shared/DatePicker";
import { TimePicker } from "@/components/shared/TimePicker";
import { Label } from "@/components/ui/label";

interface FollowUpScheduleFieldsProps {
  date: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  preferredTime: string;
  onPreferredTimeChange: (time: string) => void;
  dateLabel: string;
  timeLabel: string;
  timeOptionalHint?: string;
  dateId?: string;
  timeId?: string;
  fromDate?: Date;
  datePlaceholder?: string;
}

export function FollowUpScheduleFields({
  date,
  onDateChange,
  preferredTime,
  onPreferredTimeChange,
  dateLabel,
  timeLabel,
  timeOptionalHint,
  dateId,
  timeId,
  fromDate,
  datePlaceholder,
}: FollowUpScheduleFieldsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor={dateId}>{dateLabel}</Label>
        <DatePicker
          id={dateId}
          value={date}
          onChange={onDateChange}
          fromDate={fromDate ?? new Date()}
          placeholder={datePlaceholder}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={timeId}>{timeLabel}</Label>
        <TimePicker
          id={timeId}
          value={preferredTime}
          onChange={onPreferredTimeChange}
        />
        {timeOptionalHint ? (
          <p className="text-xs text-text-muted">{timeOptionalHint}</p>
        ) : null}
      </div>
    </div>
  );
}
