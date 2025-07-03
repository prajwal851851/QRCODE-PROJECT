"use client"

import * as React from "react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"

export function DatePicker({ value, onChange, placeholder }: { value: Date | null, onChange: (date: Date | null) => void, placeholder?: string }) {
  const [open, setOpen] = React.useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-[140px] justify-start text-left" onClick={() => setOpen(!open)}>
          {value ? format(value, "yyyy-MM-dd") : (placeholder || "Pick a date")}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-0">
        <Calendar
          mode="single"
          selected={value || undefined}
          onSelect={(date) => { onChange(date ?? null); setOpen(false); }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
} 