"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowDownIcon, ArrowRightIcon, ArrowUpIcon, MoreHorizontal, Plus, Bell, RefreshCw, X } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { fetchWithAuth } from '@/lib/api-service'
import styles from './orders.module.css'
import { ToastAction } from "@/components/ui/toast"
import { useLoading } from '@/contexts/LoadingContext'
import { getApiUrl } from '@/lib/api-service'

type OrderItem = {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
};

type OrderStatus = "pending" | "in-progress" | "completed" | "cancelled";

type Order = {
  id: string;
  table: string;
  table_name: string;
  items: OrderItem[];
  status: OrderStatus;
  total: number;
  createdAt: string;
  created_at?: string;
  updatedAt: string;
  updated_at?: string;
  special_instructions?: string;
  customer_name?: string;
  payment_status: "pending" | "paid";
  payment_method?: "cash" | "card" | "esewa" | "khalti" | "fonepay";
  dining_option?: string;
};

const formatDate = (dateString: string | undefined) => {
  if (!dateString) return 'N/A'
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'Invalid Date'
    return format(date, 'MMM d, yyyy HH:mm')
  } catch (error) {
    return 'Invalid Date'
  }
}

export default function OrdersPage() {
  const { setShow } = useLoading();
  useEffect(() => { setShow(false); }, [setShow]);
  const [orders, setOrders] = useState<Order[]>([])
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null)
  const [hasFetched, setHasFetched] = useState(false)
  const [stats, setStats] = useState({
    total_orders: 0,
    pending_orders: 0,
    in_progress_orders: 0,
    completed_orders: 0,
    unpaid_orders: 0
  })
  const [waiterCalls, setWaiterCalls] = useState<any[]>([])
  const [deletedOrders, setDeletedOrders] = useState<Order[]>([])
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(false)
  const isFetchingRef = useRef(false)

  const { toast } = useToast()

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true
    fetchOrders()
    fetchStats()
    }
    const ordersInterval = setInterval(fetchOrders, 60000) // 1 minute
    const statsInterval = setInterval(fetchStats, 60000) // 1 minute
    // Poll waiter calls
    const fetchWaiterCalls = async () => {
      try {
        const res = await fetchWithAuth(`${getApiUrl()}/api/waiter_call/active/`)
        if (!res.ok) return
        const data = await res.json()
        setWaiterCalls(data)
      } catch {}
    }
    fetchWaiterCalls()
    const interval = setInterval(fetchWaiterCalls, 15000)
    return () => {
      clearInterval(ordersInterval)
      clearInterval(statsInterval)
      clearInterval(interval)
    }
  }, [setShow])

  const fetchOrders = async () => {
    if (isFetchingRef.current) {
      console.log('[Admin Orders] Already fetching, skipping...')
      return
    }
    
    isFetchingRef.current = true
    setIsRefreshing(true)
    try {
      console.log('[Admin Orders] Fetching orders...')
      const response = await fetchWithAuth(`${getApiUrl()}/api/orders/`)
      if (!response.ok) throw new Error('Failed to fetch orders')
      const data = await response.json()
      console.log('[Admin Orders] Raw orders data:', data)
      
      // Remove duplicates using Map for better performance
      const orderMap = new Map()
      data.forEach((order: Order) => {
        if (!orderMap.has(order.id)) {
          orderMap.set(order.id, order)
        } else {
          console.log('[Admin Orders] Duplicate order found:', order.id)
        }
      })
      
      const uniqueOrders = Array.from(orderMap.values())
      console.log('[Admin Orders] Unique orders count:', uniqueOrders.length)
      console.log('[Admin Orders] Duplicates removed:', data.length - uniqueOrders.length)
      
      setOrders(uniqueOrders)
      setLastUpdated(new Date())
    } catch (error) {
      console.error('[Admin Orders] Error fetching orders:', error)
      toast({
        title: "Error",
        description: "Failed to fetch orders",
        variant: "destructive"
      })
    } finally {
      isFetchingRef.current = false
      setIsRefreshing(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetchWithAuth(`${getApiUrl()}/api/orders/dashboard_stats/`)
      if (!response.ok) throw new Error('Failed to fetch stats')
      const data = await response.json()
      setStats(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch dashboard stats",
        variant: "destructive"
      })
    }
  }

  const handleViewOrder = (order: Order) => {
    setCurrentOrder(order)
    setIsViewDialogOpen(true)
  }

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const response = await fetchWithAuth(`${getApiUrl()}/api/orders/${orderId}/update_status/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) throw new Error('Failed to update status')

    toast({
        title: "Success",
        description: "Order status updated successfully",
      })
      fetchOrders()
      fetchStats()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive"
      })
    }
  }

  const handleCancelOrder = async (orderId: string) => {
    try {
      const response = await fetchWithAuth(`${getApiUrl()}/api/orders/${orderId}/update_status/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'cancelled' }),
      });

      if (!response.ok) throw new Error('Failed to cancel order');

      toast({
        title: "Success",
        description: "Order has been cancelled.",
      });
      fetchOrders();
      fetchStats();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel order.",
        variant: "destructive",
      });
    }
  };

  const handleUpdatePayment = async (orderId: string, paymentStatus: "pending" | "paid", paymentMethod?: "cash" | "card" | "esewa" | "khalti" | "fonepay") => {
    try {
      const response = await fetchWithAuth(`${getApiUrl()}/api/orders/${orderId}/update_payment/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ payment_status: paymentStatus, payment_method: paymentMethod }),
      })

      if (!response.ok) throw new Error('Failed to update payment')

    toast({
        title: "Success",
        description: "Payment status updated successfully",
      })
      fetchOrders()
      fetchStats()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update payment status",
        variant: "destructive"
      })
    }
  }

  const handleDeleteOrder = (order: Order) => {
    // Show confirmation toast
    const { dismiss: dismissConfirm } = toast({
      title: "Delete Order",
      description: `Are you sure you want to delete order #${order.id}?`,
      action: (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              dismissConfirm()
            }}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={async () => {
              dismissConfirm()
              try {
                const response = await fetchWithAuth(`${getApiUrl()}/api/orders/${order.id}/`, {
                  method: 'DELETE',
                })
                if (!response.ok) throw new Error('Failed to delete order')
                setOrders((prev) => prev.filter((o) => o.id !== order.id))
                setDeletedOrders((prev) => [...prev, order])
                setIsViewDialogOpen(false)
                fetchStats()
                // Show undo toast with ToastAction
                const { dismiss: dismissUndo } = toast({
                  title: "Order Deleted",
                  description: `Order #${order.id} deleted. Undo available for 5 seconds.`,
                  action: (
                    <ToastAction altText="Undo" onClick={async () => {
                      try {
                        const response = await fetchWithAuth(`${getApiUrl()}/api/orders/`, {
                          method: "POST",
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(order),
                        })
                        if (!response.ok) throw new Error('Failed to restore order')
                        setDeletedOrders((prev) => prev.filter((o) => o.id !== order.id))
                        fetchOrders()
                        fetchStats()
                        dismissUndo()
                        toast({ title: "Order Restored", description: `Order #${order.id} has been restored.` })
                      } catch (error) {
                        toast({ title: "Error", description: "Failed to restore order", variant: "destructive" })
                      }
                    }}>Undo</ToastAction>
                  ),
                })
                if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current)
                undoTimeoutRef.current = setTimeout(() => {
                  setDeletedOrders((prev) => prev.filter((o) => o.id !== order.id))
                  dismissUndo()
                }, 5000)
              } catch (error) {
                toast({ title: "Error", description: "Failed to delete order", variant: "destructive" })
              }
            }}
          >
            Delete
          </Button>
        </div>
      ),
    })
  }

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'in-progress':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPaymentStatusColor = (status: "pending" | "paid") => {
    return status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
  }

  // Delete all orders handler
  const handleDeleteAllOrders = async () => {
    if (!window.confirm("Are you sure you want to delete ALL orders? This cannot be undone.")) return;
    try {
      const response = await fetchWithAuth(`${getApiUrl()}/api/orders/delete_all/`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to delete all orders');
      toast({ title: "All Orders Deleted", description: "All orders have been deleted." });
      fetchOrders();
      fetchStats();
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete all orders", variant: "destructive" });
    }
  };

  const resolveWaiterCall = async (id: number) => {
    try {
      const res = await fetchWithAuth(`${getApiUrl()}/api/waiter_call/${id}/resolve/`, { method: 'POST' })
      if (res.ok) {
        setWaiterCalls((prev) => prev.filter((c) => c.id !== id))
      }
    } catch {}
  }

  // Memoize the orders to prevent unnecessary re-renders
  const memoizedOrders = useMemo(() => {
    console.log('[Admin Orders] Memoizing orders, count:', orders.length)
    return orders
  }, [orders])

  console.log('[Admin Orders] Rendering with orders count:', memoizedOrders.length)
  console.log('[Admin Orders] Orders IDs:', memoizedOrders.map(o => o.id).slice(0, 10)) // Show first 10 IDs

  // Prevent rendering if orders is empty or undefined
  if (!hasFetched && orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <RefreshCw className="h-10 w-10 text-orange-500 animate-spin mb-4" />
        <p className="text-lg font-semibold">Please wait…</p>
        <p className="text-sm text-gray-500">Loading section, this may take a few seconds.</p>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${styles.responsiveContainer}`}>
      <div className="flex flex-col sm:flex-row justify-end mb-2 gap-2">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          {isRefreshing && (
            <RefreshCw className="h-4 w-4 animate-spin" />
          )}
          {lastUpdated && (
            <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
          )}
        </div>
        <Button variant="outline" onClick={() => { fetchOrders(); fetchStats(); }}>
          Refresh Orders
        </Button>
        <Button variant="destructive" onClick={handleDeleteAllOrders}>
          Delete All Orders
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_orders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending_orders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.in_progress_orders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unpaid Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unpaid_orders}</div>
          </CardContent>
        </Card>
      </div>

      {/* Waiter Call Notification Banner */}
      {waiterCalls.length > 0 && (
        <div className="bg-orange-100 dark:bg-orange-950/20 border-l-4 border-orange-500 dark:border-orange-400 p-4 mb-4 flex flex-col gap-2 rounded-md">
          <div className="flex items-center gap-2 mb-1">
            <Bell className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            <span className="font-semibold text-orange-900 dark:text-orange-100">Waiter Call Notification</span>
          </div>
          {waiterCalls.map((call) => (
            <div key={call.id} className="flex items-center justify-between gap-4">
              <div>
                <span className="text-orange-800 dark:text-orange-200 font-medium">Table {call.table_name || call.table} is calling for a waiter</span>
                <span className="text-xs text-gray-600 dark:text-gray-400 ml-2">{new Date(call.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground"
                onClick={() => resolveWaiterCall(call.id)}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Dismiss</span>
              </Button>
            </div>
          ))}
        </div>
      )}

      <Tabs defaultValue="all" className="w-full">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <TabsList className="w-full sm:w-auto overflow-x-auto hide-scrollbar">
            <TabsTrigger value="all">All Orders</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="in-progress">In Progress</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="all" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {memoizedOrders.map((order, index) => (
              <Card key={`order-${order.id}-${index}`} className="flex flex-col justify-between">
            <CardHeader>
                  <CardTitle>Order #{order.id}</CardTitle>
                  <CardDescription>Table {order.table_name || order.table || "?"}</CardDescription>
            </CardHeader>
            <CardContent>
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-sm">
                      <span>Status:</span>
                      <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Total:</span>
                      <span>Rs {Number(order.total).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Date:</span>
                      <span>{formatDate(order.created_at || order.createdAt)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Items:</span>
                      <span>{order.items.length}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleViewOrder(order)}>
                    View Details
                            </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="pending" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {memoizedOrders.filter(order => order.status === 'pending').map((order) => (
              <Card key={order.id} className="flex flex-col justify-between">
            <CardHeader>
                  <CardTitle>Order #{order.id}</CardTitle>
                  <CardDescription>Table {order.table_name || order.table || "?"}</CardDescription>
            </CardHeader>
            <CardContent>
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-sm">
                      <span>Status:</span>
                      <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Total:</span>
                      <span>Rs {Number(order.total).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Date:</span>
                      <span>{formatDate(order.created_at || order.createdAt)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Items:</span>
                      <span>{order.items.length}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleViewOrder(order)}>
                    View Details
                              </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="in-progress" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {memoizedOrders.filter(order => order.status === 'in-progress').map((order) => (
              <Card key={order.id} className="flex flex-col justify-between">
            <CardHeader>
                  <CardTitle>Order #{order.id}</CardTitle>
                  <CardDescription>Table {order.table_name || order.table || "?"}</CardDescription>
            </CardHeader>
            <CardContent>
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-sm">
                      <span>Status:</span>
                      <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Total:</span>
                      <span>Rs {Number(order.total).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Date:</span>
                      <span>{formatDate(order.created_at || order.createdAt)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Items:</span>
                      <span>{order.items.length}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleViewOrder(order)}>
                    View Details
                              </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="completed" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {memoizedOrders.filter(order => order.status === 'completed').map((order) => (
              <Card key={order.id} className="flex flex-col justify-between">
            <CardHeader>
                  <CardTitle>Order #{order.id}</CardTitle>
                  <CardDescription>Table {order.table_name || order.table || "?"}</CardDescription>
            </CardHeader>
            <CardContent>
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-sm">
                      <span>Status:</span>
                      <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Total:</span>
                      <span>Rs {Number(order.total).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Date:</span>
                      <span>{formatDate(order.created_at || order.createdAt)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Items:</span>
                      <span>{order.items.length}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleViewOrder(order)}>
                    View Details
                              </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="cancelled" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {memoizedOrders.filter(order => order.status === 'cancelled').map((order) => (
              <Card key={order.id} className="flex flex-col justify-between">
            <CardHeader>
                  <CardTitle>Order #{order.id}</CardTitle>
                  <CardDescription>Table {order.table_name || order.table || "?"}</CardDescription>
            </CardHeader>
            <CardContent>
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-sm">
                      <span>Status:</span>
                      <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Total:</span>
                      <span>Rs {Number(order.total).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Date:</span>
                      <span>{formatDate(order.created_at || order.createdAt)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Items:</span>
                      <span>{order.items.length}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleViewOrder(order)}>
                    View Details
                              </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* View Order Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent
          className="w-full max-w-[95vw] sm:max-w-[500px] p-4 sm:p-6 rounded-lg max-h-[90vh] overflow-y-auto"
          style={{ scrollbarGutter: 'always' }}
        >
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {currentOrder && (
            <>
              <div className="grid grid-cols-1 gap-3 w-full">
                <div>
                  <Label>Order ID</Label>
                  <div className="break-words">{currentOrder.id}</div>
                </div>
                <div>
                  <Label>Table</Label>
                  <div className="break-words">Table {currentOrder.table_name || currentOrder.table || "?"}</div>
                </div>
                <div>
                  <Label>Dining Option</Label>
                  <div>
                    {currentOrder.dining_option && (
                      <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                        {currentOrder.dining_option.charAt(0).toUpperCase() + currentOrder.dining_option.slice(1)}
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <Label>Status</Label>
                  <Badge className={getStatusColor(currentOrder.status)}>
                    {currentOrder.status}
                  </Badge>
                </div>
                <div>
                  <Label>Payment Status</Label>
                  <Badge className={getPaymentStatusColor(currentOrder.payment_status)}>
                    {currentOrder.payment_status}
                  </Badge>
                </div>
                <div>
                  <Label>Created At</Label>
                  <div className="break-words">{formatDate(currentOrder.created_at || currentOrder.createdAt)}</div>
                </div>
                <div>
                  <Label>Total</Label>
                  <div className="break-words">Rs {Number(currentOrder.total).toFixed(2)}</div>
                </div>
              </div>

              <div className="mt-4">
                <Label>Items</Label>
                <div className="overflow-x-auto">
                  <Table className="min-w-[400px] w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentOrder.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>Rs {item.price.toFixed(2)}</TableCell>
                          <TableCell>Rs {(item.price * item.quantity).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {currentOrder.special_instructions && (
                <div>
                  <Label>Special Instructions</Label>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md break-words">{currentOrder.special_instructions}</div>
                </div>
              )}

              {currentOrder.customer_name && (
                <div>
                  <Label>Customer Name</Label>
                  <div className="break-words">{currentOrder.customer_name}</div>
                </div>
              )}
              <DialogFooter className="pt-4 border-t flex flex-col gap-2 sm:flex-row sm:gap-4">
                {currentOrder.status === 'pending' && (
                  <>
                    <Button onClick={() => handleUpdateStatus(currentOrder.id, 'in-progress')} className="w-full sm:w-auto">
                      Mark as In Progress
                    </Button>
                    <Button variant="destructive" onClick={() => handleUpdateStatus(currentOrder.id, 'cancelled')} className="w-full sm:w-auto">
                      Cancel Order
                    </Button>
                  </>
                )}
                {currentOrder.status === 'in-progress' && (
                  <Button onClick={() => handleUpdateStatus(currentOrder.id, 'completed')} className="w-full sm:w-auto">
                    Mark as Completed
                  </Button>
                )}
                {currentOrder.payment_status === 'pending' && (
                  <Button onClick={() => handleUpdatePayment(currentOrder.id, 'paid', 'cash')} className="w-full sm:w-auto">
                    Mark as Paid (Cash)
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={() => handleDeleteOrder(currentOrder)}
                  className="w-full sm:w-auto"
                >
                  Delete Order
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}