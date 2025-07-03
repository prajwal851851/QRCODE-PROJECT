'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2 } from 'lucide-react'

export default function EsewaSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [verifying, setVerifying] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/payments/esewa/verify/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            transaction_code: searchParams.get('transaction_code'),
            status: searchParams.get('status'),
            total_amount: searchParams.get('total_amount'),
            transaction_uuid: searchParams.get('transaction_uuid'),
            product_code: searchParams.get('product_code'),
            signature: searchParams.get('signature'),
          }),
        })

        if (!response.ok) {
          throw new Error('Payment verification failed')
        }

        const data = await response.json()
        
        // If order_id is returned, use it for redirect
        if (data.order_id) {
          setOrderId(data.order_id)
        }

        setVerifying(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Payment verification failed')
        setVerifying(false)
      }
    }

    verifyPayment()
  }, [searchParams])

  const handleViewOrder = () => {
    if (orderId) {
      // Redirect to order status page with orderId (like cash payments)
      router.push(`/menu/order-status/${orderId}?transaction_uuid=${searchParams.get('transaction_uuid')}`)
    } else {
      // For temporary orders, redirect to temp order status page
      router.push(`/menu/order-status/temp?transaction_uuid=${searchParams.get('transaction_uuid')}`)
    }
  }

  if (verifying) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-[350px]">
          <CardHeader>
            <CardTitle>Verifying Payment</CardTitle>
            <CardDescription>Please wait while we verify your payment...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-[350px]">
          <CardHeader>
            <CardTitle className="text-red-600">Payment Failed</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/menu')} className="w-full">
              Return to Menu
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-[350px]">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-center">Payment Successful!</CardTitle>
          <CardDescription className="text-center">
            Thank you for your payment. Your order has been placed successfully.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button onClick={handleViewOrder} className="w-full">
            View Order Status
          </Button>
          <Button onClick={() => router.push('/menu')} variant="outline" className="w-full">
            Return to Menu
          </Button>
        </CardContent>
      </Card>
    </div>
  )
} 