"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Utensils, Package, Bike } from "lucide-react"

export const DINING_OPTIONS = [
  { value: "dine-in", label: "Dine-in", icon: Utensils },
  { value: "takeaway", label: "Takeaway", icon: Package },
];

export function DiningOptions({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  return (
    <div className="flex gap-2">
      {DINING_OPTIONS.map(option => (
        <Button
          key={option.value}
          variant={value === option.value ? "default" : "outline"}
          size="sm"
          className={`text-xs px-3 py-1 h-8 hover:scale-105 active:scale-95 transition-transform ${
            value === option.value ? "bg-orange-600 hover:bg-orange-700" : "bg-[#232a3a] border-gray-700 text-gray-100 hover:bg-gray-700"
          }`}
          onClick={() => onChange(option.value)}
        >
          <option.icon className="h-3 w-3 mr-1" />
          {option.label}
        </Button>
      ))}
    </div>
  );
}
