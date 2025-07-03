"use client"

import { QrCode } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface TableIndicatorProps {
  tableNumber: number
  className?: string
}

export function TableIndicator({ tableNumber, className = "" }: TableIndicatorProps) {
  return (
    <Alert className={`bg-orange-50 border-orange-200 ${className}`}>
      <QrCode className="h-4 w-4 text-orange-600" />
      <AlertTitle className="text-orange-800">Table {tableNumber}</AlertTitle>
      <AlertDescription className="text-orange-700">
        You're viewing the menu for Table {tableNumber}. Your order will be delivered to this table.
      </AlertDescription>
    </Alert>
  )
}
