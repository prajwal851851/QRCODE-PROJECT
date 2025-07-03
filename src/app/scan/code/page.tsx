"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { UtensilsCrossed } from "lucide-react"

interface ScanPageProps {
  params: {
    code: string
  }
}

export default function ScanPage({ params }: ScanPageProps) {
  const router = useRouter()
  const { code } = params

  useEffect(() => {
    // Decode the QR code
    // In a real app, this would validate the code against a database
    // For this demo, we'll assume the code is a table ID

    try {
      // Simple validation - check if code is numeric
      if (/^\d+$/.test(code)) {
        const tableId = Number.parseInt(code)

        // Simulate API call delay
        const timeout = setTimeout(() => {
          // Redirect to the menu page with the table parameter
          router.push(`/menu?table=${tableId}`)
        }, 1000)

        return () => clearTimeout(timeout)
      } else {
        // Invalid code
        console.error("Invalid QR code")
        // In a real app, you would show an error message
      }
    } catch (error) {
      console.error("Error processing QR code:", error)
    }
  }, [code, router])

  return (
    <div className="min-h-screen bg-orange-50 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 pb-6 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-6">
            <UtensilsCrossed className="h-8 w-8 text-orange-600" />
            <h1 className="text-2xl font-bold text-orange-800">QR Menu</h1>
          </div>

          <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mb-6"></div>

          <h2 className="text-xl font-semibold mb-2">Processing QR Code</h2>
          <p className="text-gray-500 text-center">Please wait while we redirect you to the menu for Table {code}...</p>
        </CardContent>
      </Card>
    </div>
  )
}
