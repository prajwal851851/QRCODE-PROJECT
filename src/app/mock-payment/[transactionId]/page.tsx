"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle, XCircle, CreditCard, AlertCircle } from "lucide-react"

interface MockTransaction {
  order_id: string
  amount: number
  product_code: string
  status: string
  created_at: string
}

export default function MockPaymentPage() {
  const params = useParams()
  const router = useRouter()
  
  // Handle case where params might be null
  if (!params || !params.transactionId) {
    // Redirect to menu if no transaction ID
    router.push('/menu')
    return null
  }
  
  const transactionId = params.transactionId as string
  
  const [transaction, setTransaction] = useState<MockTransaction | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<'success' | 'failure' | 'cancelled' | null>(null)

  useEffect(() => {
    // Simulate loading transaction details
    setTimeout(() => {
      setTransaction({
        order_id: transactionId.split('_')[1] || 'UNKNOWN',
        amount: 1500, // Mock amount
        product_code: 'EPAYTEST',
        status: 'PENDING',
        created_at: new Date().toISOString()
      })
      setLoading(false)
    }, 1000)
  }, [transactionId])

  const handlePayment = async (status: 'success' | 'failure' | 'cancelled') => {
    setProcessing(true)
    
    // Simulate payment processing
    setTimeout(() => {
      setResult(status)
      setProcessing(false)
      
      // Redirect after showing result
      setTimeout(() => {
        if (status === 'success') {
          router.push('/esewa/success')
        } else if (status === 'failure') {
          router.push('/esewa/failure')
        } else {
          router.push('/menu/payment-cancelled')
        }
      }, 2000)
    }, 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">Loading payment details...</p>
        </div>
      </div>
    )
  }

  if (result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            {result === 'success' && (
              <>
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <CardTitle className="text-green-600">Payment Successful!</CardTitle>
                <CardDescription>
                  Your payment has been processed successfully.
                </CardDescription>
              </>
            )}
            {result === 'failure' && (
              <>
                <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
                <CardTitle className="text-red-600">Payment Failed</CardTitle>
                <CardDescription>
                  Your payment could not be processed. Please try again.
                </CardDescription>
              </>
            )}
            {result === 'cancelled' && (
              <>
                <AlertCircle className="h-16 w-16 text-yellow-600 mx-auto mb-4" />
                <CardTitle className="text-yellow-600">Payment Cancelled</CardTitle>
                <CardDescription>
                  You cancelled the payment. No charges were made.
                </CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Redirecting you back to the restaurant...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-md mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="text-center border-b">
            <div className="flex items-center justify-center mb-4">
              <CreditCard className="h-8 w-8 text-blue-600 mr-2" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Mock eSewa Payment
              </h1>
            </div>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              This is a test payment interface for development purposes
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6">
            {transaction && (
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                    <strong>Transaction ID:</strong> {transactionId}
                  </p>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                    <strong>Order ID:</strong> {transaction.order_id}
                  </p>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Amount:</strong> NPR {transaction.amount}
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Test Payment Options:
                  </h3>
                  
                  <Button
                    onClick={() => handlePayment('success')}
                    disabled={processing}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    {processing ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Simulate Successful Payment
                  </Button>

                  <Button
                    onClick={() => handlePayment('failure')}
                    disabled={processing}
                    variant="destructive"
                    className="w-full"
                  >
                    {processing ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    Simulate Failed Payment
                  </Button>

                  <Button
                    onClick={() => handlePayment('cancelled')}
                    disabled={processing}
                    variant="outline"
                    className="w-full"
                  >
                    {processing ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <AlertCircle className="h-4 w-4 mr-2" />
                    )}
                    Cancel Payment
                  </Button>
                </div>

                <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Note:</strong> This is a mock payment interface for testing. 
                    No real money will be charged. Choose an option above to simulate 
                    different payment scenarios.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 