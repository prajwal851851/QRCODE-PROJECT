"use client"

import { useState, useEffect, useRef } from "react"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Star, Clock, CheckCircle, X, RefreshCw, AlertCircle } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useRouter, useSearchParams } from "next/navigation"
import { createOrderWithCheck } from '@/lib/api-service'

type OrderStatus = "pending" | "in-progress" | "completed" | "cancelled"

interface Order {
  id: string
  status: OrderStatus
  payment_status: "pending" | "paid"
  total: number
  created_at?: string
  createdAt?: string
  table: string | number
  payment_method?: string
}

export function OrderStatus({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSubmittedReview, setHasSubmittedReview] = useState(false)
  const [showThankYou, setShowThankYou] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tableId = searchParams ? searchParams.get('table') : null;
  const transactionUuid = searchParams ? searchParams.get('transaction_uuid') : null;
  const mountedRef = useRef(false)
  const isFetchingRef = useRef(false)

  // Check if review exists for this order
  const checkExistingReview = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/reviews/?order=${orderId}`)
      if (response.ok) {
        const reviews = await response.json()
        if (reviews.length > 0) {
          setHasSubmittedReview(true)
        }
      }
    } catch (error) {
      console.error("Error checking existing review:", error)
    }
  }

  useEffect(() => {
    if (orderId) {
      checkExistingReview()
    }
  }, [orderId])

  // Prevent back navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (showReviewForm) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [showReviewForm])

  const fetchOrder = async (isManualRefresh = false) => {
    if (isFetchingRef.current) return

    try {
      isFetchingRef.current = true
      setIsRefreshing(isManualRefresh)
      setFetchError(null)

      const response = await fetch(`/api/orders/${orderId}`)
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

  const createOrderAfterEsewa = async () => {
      try {
      const orderDetailsStr = localStorage.getItem('pendingEsewaOrder');
      if (!orderDetailsStr) {
        setFetchError('Order details not found after payment.');
        return;
      }
      const orderDetails = JSON.parse(orderDetailsStr);
      
      // Use the new function with duplicate check
      const data = await createOrderWithCheck({
        ...orderDetails,
        transaction_uuid: transactionUuid
      });
        
      // Link the eSewa transaction to the newly created order
      if (transactionUuid && data.id) {
        try {
          await fetch('http://localhost:8000/api/payments/esewa/link/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              transaction_uuid: transactionUuid,
              order_id: data.id
            }),
          })
        } catch (linkError) {
          console.warn('Failed to link transaction to order:', linkError)
          // Don't fail the whole process if linking fails
        }
      }
        
      localStorage.removeItem('pendingEsewaOrder');
        setOrder(data);
        setIsLoading(false);
      } catch (error) {
      setFetchError('Failed to create order after payment.');
        setIsLoading(false);
      }
    };

  useEffect(() => {
    if (transactionUuid) {
      if (transactionUuid.startsWith('cash-')) {
        // Skip eSewa verification for cash payments, just fetch the order
                fetchOrder();
          } else {
      fetch(`http://localhost:8000/api/payments/esewa/verify/?transaction_uuid=${transactionUuid}`)
          .then(res => res.json())
          .then(async data => {
            if (data.status === 'success') {
              // Try to fetch the order, if not found, create it
              try {
                await fetchOrder();
              } catch (err) {
                // If fetchOrder fails (404), create the order
                await createOrderAfterEsewa();
              }
            }
          });
      }
    } else {
      fetchOrder();
    }
  }, [transactionUuid]);

  useEffect(() => {
    mountedRef.current = true
    fetchOrder()
    return () => {
      mountedRef.current = false
    }
  }, [orderId])

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

  useEffect(() => {
    if (order?.status === 'completed' && !hasSubmittedReview) {
      setShowReviewForm(true)
    }
  }, [order?.status, hasSubmittedReview])

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) {
      toast({
        title: "Rating Required",
        description: "Please select a rating before submitting your review.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("http://localhost:8000/api/reviews/create/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order: orderId,
          rating,
          comment,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        if (response.status === 400 && data.error) {
          toast({
            title: "Already Reviewed",
            description: data.error,
            variant: "destructive",
          })
        } else {
          throw new Error("Failed to submit review")
        }
        return
      }

      toast({
        title: "Thank You!",
        description: "Your review helps us improve our service.",
      })
      setShowReviewForm(false)
      setShowThankYou(true)
      setTimeout(() => setShowThankYou(false), 4000)
      setRating(0)
      setComment("")
      setHasSubmittedReview(true)
      
      // Redirect to menu page with table ID
      if (tableId) {
        router.push(`/menu?table=${tableId}`)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit review. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "in-progress":
        return "bg-blue-100 text-blue-800"
      case "completed":
        return "bg-green-100 text-green-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPaymentStatusColor = (status: "pending" | "paid") => {
    return status === "paid" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
  }

  const handleManualRefresh = () => {
    if (!isFetchingRef.current) {
      fetchOrder(true)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Order Status...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (fetchError && !isLoading) {
    return (
      <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
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
    )
  }

  if (!order) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Order Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Unable to find order details. Please try again later.</p>
          {/* Try to create the order if eSewa payment was successful */}
          {transactionUuid && !transactionUuid.startsWith('cash-') && (
            <Button onClick={createOrderAfterEsewa} className="mt-4">Try Creating Order</Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#181e29] p-4">
      <Card className="max-w-md w-full mx-auto p-6 rounded-2xl shadow-lg bg-gradient-to-br from-[#181e29] to-[#232a3a] border-none">
        <CardHeader className="mb-4 flex flex-col items-center">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-white">Order Status</h1>
            <div className="flex items-center gap-2">
              {lastUpdated && (
                <span className="text-sm text-gray-300">
                  Last updated: {format(lastUpdated, 'HH:mm:ss')}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="text-white hover:text-gray-300 p-1"
              >
                {isRefreshing ? (
                  <div className="flex items-center gap-1">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Refreshing...</span>
                  </div>
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge className="bg-yellow-400 text-black flex items-center gap-1 px-2 py-1 text-xs font-semibold">
              <Clock className="w-4 h-4" />
              {order?.status || "pending"}
            </Badge>
            <Badge className={`flex items-center gap-1 px-2 py-1 text-xs font-semibold ${order?.payment_status === "paid" ? "bg-green-500 text-white" : "bg-gray-400 text-white"}`}>
              <CheckCircle className="w-4 h-4" />
              {order?.payment_status || "pending"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 mb-4">
            <div className="flex justify-between text-gray-300">
              <span>Order ID:</span>
              <span className="font-mono text-white">{order?.id}</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Total:</span>
              <span className="font-bold text-lg text-white">RS {order?.total}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Created:</span>
              <span>{order?.created_at ? format(new Date(order.created_at), "PPpp") : "-"}</span>
            </div>
            {/* Payment Status Row */}
            <div className="flex justify-between text-gray-300 items-center">
              <span>Payment Status:</span>
              <span>
                {order?.payment_status === "paid" ? (
                  <Badge className="bg-green-500 text-white flex items-center gap-1 px-2 py-1 text-xs font-semibold">
                    <CheckCircle className="w-4 h-4" /> Paid
                  </Badge>
                ) : (
                  <Badge className="bg-gray-400 text-white flex items-center gap-1 px-2 py-1 text-xs font-semibold">
                    <Clock className="w-4 h-4" /> Pending
                  </Badge>
                )}
              </span>
            </div>
            {/* Cash payment pending message */}
            {order?.payment_status === "pending" && order?.payment_method === "cash" && (
              <div className="flex items-center gap-2 text-yellow-400 text-lg font-semibold mb-6 justify-center">
                <Clock className="w-6 h-6" />
                Please pay cash to the staff. Your order is being processed.
            </div>
            )}
          </div>
          {order?.payment_status === "paid" && (
            <div className="flex items-center gap-2 text-green-400 text-lg font-semibold mb-6 justify-center">
              <CheckCircle className="w-6 h-6" />
              Payment received. Thank you!
            </div>
          )}
          <div className="bg-[#232a3a] rounded-xl p-4 flex flex-col items-center mt-4">
            <Star className="w-8 h-8 text-yellow-400 mb-2" />
            <h3 className="text-lg font-bold text-white mb-2">Share Your Experience</h3>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-full text-base font-semibold shadow mb-2" onClick={() => setShowReviewForm(true)}>
              Write a Review
            </Button>
      {showReviewForm && (
              <form onSubmit={handleSubmitReview} className="w-full flex flex-col gap-2 mt-2">
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-sm text-gray-200">Your Rating:</span>
                  {[1,2,3,4,5].map(star => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setRating(star)}
                      className={star <= rating ? "text-yellow-400" : "text-gray-400"}
                    >
                      <Star className="w-5 h-5" fill={star <= rating ? "#fbbf24" : "none"} />
                    </button>
                  ))}
                </div>
                <textarea
                  className="w-full rounded p-2 text-sm bg-[#181e29] text-white border border-gray-600"
                  rows={3}
                  placeholder="Write your feedback..."
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  required
                />
              <div className="flex gap-2">
                  <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white flex-1">Submit</Button>
                  <Button type="button" variant="ghost" className="flex-1" onClick={() => setShowReviewForm(false)}>
                    <X className="w-4 h-4 mr-1" /> Cancel
                </Button>
                </div>
                {isSubmitting && <span className="text-xs text-gray-400">Submitting...</span>}
              </form>
            )}
            {showThankYou && (
              <div className="mt-2 text-center text-green-400 text-sm font-semibold bg-green-900/20 rounded p-2">
                Thank you for your review! It helps us improve our service.
              </div>
            )}
          </div>
          </CardContent>
        </Card>
    </div>
  )
}