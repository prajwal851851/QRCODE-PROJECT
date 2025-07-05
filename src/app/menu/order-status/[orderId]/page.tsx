'use client'

import { Suspense } from 'react'
import { OrderStatus } from "../../components/OrderStatus"

interface OrderStatusPageProps {
  params: {
    orderId: string
  }
}

export default function OrderStatusPage({ params }: OrderStatusPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f1419] to-[#1a1f2e] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Suspense fallback={
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <span className="ml-3 text-white">Loading order...</span>
          </div>
        }>
          <OrderStatus orderId={params.orderId} />
        </Suspense>
      </div>
    </div>
  )
}