'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { OrderStatus } from "../../components/OrderStatus"
import WaiterCallNotificationBar from "../WaiterCallNotificationBar"
import { useToast } from "@/hooks/use-toast"
import { createOrderWithCheck, getApiUrl } from '@/lib/api-service'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, AlertCircle } from "lucide-react"
import { format } from "date-fns"

interface Order {
  id: string
  status: string
  total_amount: number
  payment_status: string
  created_at: string
  items: any[]
}

export default function TempOrderStatusPage() {
  const searchParams = useSearchParams()
  const [orderId, setOrderId] = useState<string | null>(null)
  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const mountedRef = useRef(false)
  const isFetchingRef = useRef(false)
  const { toast } = useToast()

  const fetchOrder = async (isManualRefresh = false) => {
    if (!orderId || isFetchingRef.current) return

    try {
      isFetchingRef.current = true
      setIsRefreshing(isManualRefresh)
      setFetchError(null)

      const response = await fetch(`${getApiUrl()}/api/orders/${orderId}`)
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

  const handleManualRefresh = () => {
    if (!isFetchingRef.current && orderId) {
      fetchOrder(true)
    }
  }

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    const transactionUuid = searchParams.get('transaction_uuid')
    const orderIdParam = searchParams.get('orderId')
    
    // Handle malformed URLs with double question marks (eSewa issue)
    let actualTransactionUuid = transactionUuid
    if (!actualTransactionUuid) {
      // Try to extract from the full URL if searchParams didn't work
      const fullUrl = window.location.href
      const transactionMatch = fullUrl.match(/transaction_uuid=([^&]+)/)
      if (transactionMatch) {
        actualTransactionUuid = transactionMatch[1]
        console.log('Extracted transaction_uuid from malformed URL:', actualTransactionUuid)
      }
    }
    
    // Clean the transaction_uuid - remove any query parameters
    if (actualTransactionUuid && actualTransactionUuid.includes('?')) {
      actualTransactionUuid = actualTransactionUuid.split('?')[0]
      console.log('Cleaned transaction_uuid:', actualTransactionUuid)
    }
    
    // If orderId is in URL, use it directly (like cash payments)
    if (orderIdParam) {
      setOrderId(orderIdParam)
      setIsLoading(false)
      return
    }
    
    // If no orderId but transaction_uuid exists, handle order creation/lookup
    if (actualTransactionUuid) {
      const handleOrderProcess = async () => {
        try {
          // 1. First check if an order already exists for this transaction_uuid
          const checkRes = await fetch(`${getApiUrl()}/api/orders/?transaction_uuid=${actualTransactionUuid}`)
          if (checkRes.ok) {
            const checkData = await checkRes.json()
            if (Array.isArray(checkData) && checkData.length > 0) {
              // Order already exists for this transaction
              setOrderId(checkData[0].id)
              setIsLoading(false)
              return
            }
          }
          
          // 2. If no existing order found, try to create from localStorage (new payment)
          const pendingOrderData = localStorage.getItem('pendingEsewaOrder')
          if (pendingOrderData) {
            const orderDetails = JSON.parse(pendingOrderData)
            console.log('Order details from localStorage:', orderDetails)
            
            // Get table ID
            let tableId = Number(orderDetails.tableName)
            if (isNaN(tableId)) {
              const res = await fetch(`${getApiUrl()}/api/tables/?public_id=${orderDetails.tableName}`)
              if (!res.ok) throw new Error('Failed to fetch table info')
              const tables = await res.json()
              if (!tables.length) throw new Error('Table not found')
              tableId = tables[0].id
            }
            
            const orderData = {
              table: tableId,
              items: orderDetails.items,
              customer_name: orderDetails.customer_name,
              special_instructions: orderDetails.special_instructions,
              dining_option: orderDetails.dining_option,
              total: orderDetails.total,
              payment_status: 'paid', // Since payment was successful
              payment_method: 'esewa',
              extra_charges_applied: orderDetails.extra_charges_applied,
              transaction_uuid: actualTransactionUuid
            }
            
            console.log('Sending order data to API:', orderData)

            // Create the actual order using the function with duplicate check
            const data = await createOrderWithCheck(orderData)
            const newOrderId = data.id || (data.order && data.order.id)
            
            // Link the eSewa transaction to the newly created order
            try {
              await fetch(`${getApiUrl()}/api/payments/esewa/link/`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  transaction_uuid: actualTransactionUuid,
                  order_id: newOrderId
                }),
              })
            } catch (linkError) {
              console.warn('Failed to link transaction to order:', linkError)
              // Don't fail the whole process if linking fails
            }
            
            // Clear localStorage
            localStorage.removeItem('pendingEsewaOrder')
            
            // Set the order ID for the OrderStatus component
            setOrderId(newOrderId)
            setIsLoading(false)
          } else {
            // No localStorage data - this might be a page refresh
            // Try to recreate the order from the transaction
            try {
              console.log('Attempting to recreate order from transaction:', actualTransactionUuid)
              console.log('Transaction UUID being sent to API:', actualTransactionUuid)
              
              const recreateRes = await fetch(`${getApiUrl()}/api/payments/esewa/recreate-order/`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  transaction_uuid: actualTransactionUuid
                }),
              })
              
              console.log('Recreate API response status:', recreateRes.status)
              const recreateData = await recreateRes.json()
              console.log('Recreate API response data:', recreateData)
              
              if (recreateRes.ok) {
                if (recreateData.status === 'success') {
                  console.log('Order recreated successfully:', recreateData.order_id)
                  setOrderId(recreateData.order_id)
                  setIsLoading(false)
                  return
                } else {
                  throw new Error(recreateData.message || 'Failed to recreate order')
                }
              } else {
                throw new Error(recreateData.message || 'Failed to recreate order')
              }
            } catch (recreateError) {
              console.error('Error recreating order:', recreateError)
              setFetchError('Order not found for this transaction. Please contact support.')
              setIsLoading(false)
            }
          }
        } catch (err) {
          console.error('Error handling order process:', err)
          setFetchError(err instanceof Error ? err.message : 'Failed to process order')
          setIsLoading(false)
        }
      }
      
      handleOrderProcess()
    } else {
      setFetchError('Missing transaction information. Please use the correct link.')
      setIsLoading(false)
    }
  }, [searchParams])

  useEffect(() => {
    if (orderId) {
      fetchOrder()
    }
  }, [orderId])

  useEffect(() => {
    if (!order || order.status === 'completed' || order.status === 'cancelled') {
      return
    }

    const interval = setInterval(() => {
      if (mountedRef.current && !isFetchingRef.current && orderId) {
        fetchOrder()
      }
    }, 60000) // 1 minute

    return () => clearInterval(interval)
  }, [order?.status, orderId])

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
            <CardTitle className="text-white text-center">Error Loading Order</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Error loading order</span>
              </div>
              <p className="text-xs mt-1">{fetchError}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualRefresh}
                className="mt-2 text-xs"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!orderId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f1419] to-[#1a1f2e] flex items-center justify-center p-4">
        <Card className="max-w-md w-full mx-auto p-6 rounded-2xl shadow-lg bg-gradient-to-br from-[#181e29] to-[#232a3a] border-none">
          <CardContent className="flex items-center justify-center py-8">
            <span className="text-white">No order ID available</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f1419] to-[#1a1f2e] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <OrderStatus orderId={orderId} />
      </div>
    </div>
  )
} 