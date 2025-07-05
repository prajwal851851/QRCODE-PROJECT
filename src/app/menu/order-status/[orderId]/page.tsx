"use client"

import { useState, useEffect, useRef } from "react"
import { OrderStatus } from "@/app/menu/components/OrderStatus"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, AlertCircle } from "lucide-react"
import { format } from "date-fns"
import { getApiUrl } from '@/lib/api-service';

interface Order {
  id: string
  status: string
  total_amount: number
  payment_status: string
  created_at: string
  items: any[]
}

export default function OrderStatusPage({ params }: { params: { orderId: string } }) {
  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const mountedRef = useRef(false)
  const isFetchingRef = useRef(false)

  const fetchOrder = async (isManualRefresh = false) => {
    if (isFetchingRef.current) return

    try {
      isFetchingRef.current = true
      setIsRefreshing(isManualRefresh)
      setFetchError(null)

      const response = await fetch(getApiUrl() + `/api/orders/${params.orderId}/`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      
      if (mountedRef.current) {
        setOrder(data)
        setLastUpdated(new Date())
        setIsLoading(false)
        setIsRefreshing(false)
      }
    } catch (error) {
      console.error('Error fetching order:', error)
      if (mountedRef.current) {
        setFetchError(error instanceof Error ? error.message : 'Failed to fetch order')
        setIsRefreshing(false)
        if (!order) {
          setIsLoading(false)
  }
}
    } finally {
      isFetchingRef.current = false
    }
  }

  useEffect(() => {
    mountedRef.current = true
    fetchOrder()
    return () => {
      mountedRef.current = false
    }
  }, [params.orderId])

  useEffect(() => {
    if (!order || order.status === 'completed' || order.status === 'cancelled') {
      return
    }

    const interval = setInterval(() => {
      if (mountedRef.current && !isFetchingRef.current) {
        fetchOrder()
      }
    }, 60000) // 1 minute

    return () => clearInterval(interval)
  }, [order?.status])

  const handleManualRefresh = () => {
    if (!isFetchingRef.current) {
      fetchOrder(true)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f1419] to-[#1a1f2e] flex items-center justify-center p-4">
        <Card className="max-w-md w-full mx-auto p-6 rounded-2xl shadow-lg bg-gradient-to-br from-[#181e29] to-[#232a3a] border-none">
          <CardContent className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <span className="ml-3 text-white">Loading order...</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (fetchError && !isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f1419] to-[#1a1f2e] flex items-center justify-center p-4">
        <Card className="max-w-md w-full mx-auto p-6 rounded-2xl shadow-lg bg-gradient-to-br from-[#181e29] to-[#232a3a] border-none">
          <CardHeader>
            <CardTitle className="text-white text-center">Order Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Order not found</span>
              </div>
              <p className="text-xs mt-1">Order ID: {params.orderId}</p>
              <p className="text-xs mt-1">This order may have been deleted or doesn't exist.</p>
              <div className="flex gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualRefresh}
                  className="text-xs"
                >
                  Try Again
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.href = '/menu'}
                  className="text-xs"
                >
                  Back to Menu
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f1419] to-[#1a1f2e] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <OrderStatus orderId={params.orderId} />
      </div>
    </div>
  )
}