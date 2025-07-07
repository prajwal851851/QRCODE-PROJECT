"use client"

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, Clock } from 'lucide-react'

interface MockTransaction {
  id: string
  order_id: string
  amount: number
  status: 'PENDING' | 'COMPLETED' | 'FAILED'
  created_at: string
}

export default function MockPaymentPage() {
  const router = useRouter()
  const params = useParams()
  const transactionId = params.transactionId as string
  
  const [transaction, setTransaction] = useState<MockTransaction | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    // Simulate loading transaction data
    setTimeout(() => {
      setTransaction({
        id: transactionId,
        order_id: `ORD-${Date.now()}`,
        amount: 100,
        status: 'PENDING',
        created_at: new Date().toISOString()
      })
      setLoading(false)
    }, 1000)
  }, [transactionId])

  const handlePaymentSuccess = async () => {
    setProcessing(true)
    
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Update transaction status
    setTransaction(prev => prev ? { ...prev, status: 'COMPLETED' } : null)
    
    // Redirect to success page
    setTimeout(() => {
      router.push(`/esewa/success?transaction_uuid=${transactionId}&status=COMPLETE`)
    }, 1000)
  }

  const handlePaymentFailure = async () => {
    setProcessing(true)
    
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Update transaction status
    setTransaction(prev => prev ? { ...prev, status: 'FAILED' } : null)
    
    // Redirect to failure page
    setTimeout(() => {
      router.push(`/esewa/failure?transaction_uuid=${transactionId}&status=FAILED`)
    }, 1000)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>Loading Payment</CardTitle>
            <CardDescription>Please wait...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!transaction) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle className="text-red-600">Transaction Not Found</CardTitle>
            <CardDescription>The payment transaction could not be found.</CardDescription>
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
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            Mock Payment Gateway
          </CardTitle>
          <CardDescription>
            This is a mock payment gateway for testing purposes.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Transaction ID:</span>
              <span className="text-sm font-mono">{transaction.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Order ID:</span>
              <span className="text-sm font-mono">{transaction.order_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Amount:</span>
              <span className="text-sm font-semibold">Rs. {transaction.amount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Status:</span>
              <span className={`text-sm font-medium ${
                transaction.status === 'COMPLETED' ? 'text-green-600' :
                transaction.status === 'FAILED' ? 'text-red-600' :
                'text-blue-600'
              }`}>
                {transaction.status}
              </span>
            </div>
          </div>

          {transaction.status === 'PENDING' && (
            <div className="space-y-3">
              <div className="text-sm text-gray-600">
                Choose an action to simulate the payment result:
              </div>
              
              <Button 
                onClick={handlePaymentSuccess}
                disabled={processing}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Simulate Successful Payment
                  </>
                )}
              </Button>
              
              <Button 
                onClick={handlePaymentFailure}
                disabled={processing}
                variant="destructive"
                className="w-full"
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Simulate Failed Payment
                  </>
                )}
              </Button>
            </div>
          )}

          {transaction.status === 'COMPLETED' && (
            <div className="text-center space-y-3">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
              <div className="text-green-600 font-medium">Payment Successful!</div>
              <div className="text-sm text-gray-600">Redirecting to success page...</div>
            </div>
          )}

          {transaction.status === 'FAILED' && (
            <div className="text-center space-y-3">
              <XCircle className="h-12 w-12 text-red-500 mx-auto" />
              <div className="text-red-600 font-medium">Payment Failed!</div>
              <div className="text-sm text-gray-600">Redirecting to failure page...</div>
            </div>
          )}

          <div className="pt-4 border-t">
            <Button 
              onClick={() => router.push('/menu')} 
              variant="outline" 
              className="w-full"
            >
              Cancel and Return to Menu
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 