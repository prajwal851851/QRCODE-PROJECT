"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { XCircle } from "lucide-react"

export default function PaymentCancelledPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get('order_id')
  const tableId = searchParams.get('tableId')
  const tableUid = searchParams.get('tableUid')

  useEffect(() => {
    // Auto-redirect after 5 seconds
    const timer = setTimeout(() => {
      if (tableUid) {
        router.push(`/menu?tableUid=${tableUid}`)
      } else if (tableId) {
        router.push(`/menu?tableId=${tableId}`)
      } else {
        router.push('/menu')
      }
    }, 5000)

    return () => clearTimeout(timer)
  }, [router, tableUid, tableId])

  const handleReturnToMenu = () => {
    if (tableUid) {
      router.push(`/menu?tableUid=${tableUid}`)
    } else if (tableId) {
      router.push(`/menu?tableId=${tableId}`)
    } else {
      router.push('/menu')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
            <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-xl text-red-600 dark:text-red-400">
            Payment Cancelled
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Your payment was cancelled. You can try again or return to the menu.
          </p>
          <div className="flex flex-col gap-2">
            <Button 
              onClick={handleReturnToMenu}
              className="w-full"
            >
              Return to Menu
            </Button>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              You will be automatically redirected in 5 seconds...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 