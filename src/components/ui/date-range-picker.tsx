"use client"

import * as React from "react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { format, startOfToday, subDays, startOfMonth, endOfMonth } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

export const quickRanges = [
  {
    label: "Today",
    getRange: () => {
      const today = startOfToday();
      return { start: today, end: today };
    },
  },
  {
    label: "Last 7 Days",
    getRange: () => {
      const today = startOfToday();
      return { start: subDays(today, 6), end: today };
    },
  },
  {
    label: "This Month",
    getRange: () => {
      const today = startOfToday();
      return { start: startOfMonth(today), end: endOfMonth(today) };
    },
  },
  {
    label: "All Time",
    getRange: () => ({ start: null, end: null }),
  },
];

export function DateRangePicker({ value, onChange, placeholder, onQuickSelect }: {
  value: { start: Date | null, end: Date | null },
  onChange: (range: { start: Date | null, end: Date | null }) => void,
  placeholder?: string,
  onQuickSelect?: (range: { start: Date | null, end: Date | null }) => void,
}) {
  const [open, setOpen] = React.useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-[240px] justify-start text-left font-semibold border-2 border-orange-500" onClick={() => setOpen(!open)}>
          <CalendarIcon className="mr-2 h-4 w-4 text-orange-500" />
          {value.start && value.end
            ? `${format(value.start, "yyyy-MM-dd")} - ${format(value.end, "yyyy-MM-dd")}`
            : (placeholder || "Pick date range")}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-4 w-[340px]">
        <div className="mb-2 flex flex-wrap gap-2">
          {quickRanges.map((q) => (
            <Button key={q.label} size="sm" variant="secondary" onClick={() => {
              const range = q.getRange();
              onChange(range);
              if (onQuickSelect) onQuickSelect(range);
              setOpen(false);
            }}>{q.label}</Button>
          ))}
        </div>
        <Calendar
          mode="range"
          selected={value.start && value.end ? { from: value.start, to: value.end } : undefined}
          onSelect={(range) => {
            if (range && range.from && range.to) {
              onChange({ start: range.from, end: range.to });
              setOpen(false);
            }
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
} 