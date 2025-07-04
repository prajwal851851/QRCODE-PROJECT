"use client"

import { useState, useEffect, useRef } from "react"
import { Bell, X, Check, AlertCircle, ListOrdered, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { getApiUrl } from '../lib/api-service';

interface PaymentNotification {
  id: string
  tableNumber: number
  amount: number
  timestamp: string
  status: "pending" | "completed" | "failed"
  paymentMethod: string
}

interface OrderNotification {
  id: string
  table_name: string
  total: number
  status: string
  created_at: string
}

interface WaiterCallNotification {
  id: number
  table_name: string
  status: string
  created_at: string
}

// Fix for TypeScript: ensure AudioContext is recognized on window
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

export function PaymentNotificationSystem() {
  const [notifications, setNotifications] = useState<PaymentNotification[]>([])
  const [orderNotifications, setOrderNotifications] = useState<OrderNotification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [activeTab, setActiveTab] = useState<'payments' | 'orders' | 'waiter_calls'>('payments')
  const { toast } = useToast()
  const [waiterCalls, setWaiterCalls] = useState<WaiterCallNotification[]>([])

  // Audio context ref
  const audioContextRef: React.MutableRefObject<AudioContext | null> = useRef<AudioContext | null>(null);
  
  // Track previous notifications to detect new ones
  const prevPaymentIds = useRef<string[]>([]);
  const prevOrderIds = useRef<string[]>([]);
  const prevWaiterIds = useRef<number[]>([]);
  const isInitialLoad = useRef(true);

  // Initialize audio context
  useEffect(() => {
    const initAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
    };

    // Initialize on user interaction
    const handleUserInteraction = () => {
      initAudio();
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };

    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, []);

  // Function to generate and play notification sounds (now using speech synthesis)
  const playNotificationSound = (type: 'payment' | 'order' | 'waiter', details?: any) => {
    let message = '';
    switch (type) {
      case 'payment':
        if (details) {
          message = `You received a payment of ${details.amount} rupees from table ${details.tableNumber}.`;
        } else {
          message = 'You received a new payment.';
        }
        break;
      case 'order':
        if (details) {
          message = `You received a new order from table ${details.table_name}.`;
        } else {
          message = 'You received a new order.';
        }
        break;
      case 'waiter':
        if (details) {
          message = `Customer at table ${details.table_name} is calling for a waiter.`;
        } else {
          message = 'A customer is calling for a waiter.';
        }
        break;
    }
    if ('speechSynthesis' in window) {
      const utterance = new window.SpeechSynthesisUtterance(message);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    } else {
      // fallback: beep
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      const audioContext = audioContextRef.current || new AudioContextClass();
      audioContextRef.current = audioContext;
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.4);
    }
  };

  // Fetch real payments from backend
  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const token = localStorage.getItem("adminAccessToken");
        const res = await fetch(`${getApiUrl()}/api/payments/`, {
          headers: token ? { "Authorization": `Bearer ${token}` } : {},
          credentials: "include",
        });
        if (!res.ok) return;
        const data = await res.json();
        const newIds = data.map((p: any) => p.id);
        
        // Play horn if new payment detected (skip on initial load)
        if (!isInitialLoad.current && prevPaymentIds.current.length > 0 && newIds.length > 0) {
          const hasNewPayment = newIds.some((id: string) => !prevPaymentIds.current.includes(id));
          if (hasNewPayment) {
            const newPayment = data.find((p: any) => !prevPaymentIds.current.includes(p.id));
            playNotificationSound('payment', {
              amount: newPayment?.amount,
              tableNumber: newPayment?.order?.table || 'N/A',
            });
          }
        }
        
        prevPaymentIds.current = newIds;
        setNotifications(data.map((payment: any) => ({
          id: payment.id,
          tableNumber: payment.order?.table || 'N/A',
          amount: payment.amount,
          timestamp: payment.created_at,
          status: payment.status,
          paymentMethod: payment.payment_method || 'Unknown',
        })));
      } catch (error) {
        console.error("Error fetching payments:", error);
      }
    };
    
    fetchPayments();
    const interval = setInterval(fetchPayments, 15000);
    
    // Mark initial load as complete after first fetch
    setTimeout(() => { isInitialLoad.current = false; }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Fetch real orders from backend
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem("adminAccessToken");
        const res = await fetch(`${getApiUrl()}/api/orders/dashboard_full_stats/`, {
          headers: token ? { "Authorization": `Bearer ${token}` } : {},
          credentials: "include",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.recent_orders) {
          const newIds = data.recent_orders.map((o: any) => o.id);
          
          // Play order sound if new order detected (skip on initial load)
          if (!isInitialLoad.current && prevOrderIds.current.length > 0 && newIds.length > 0) {
            const hasNewOrder = newIds.some((id: string) => !prevOrderIds.current.includes(id));
            if (hasNewOrder) {
              const newOrder = data.recent_orders.find((o: any) => !prevOrderIds.current.includes(o.id));
              playNotificationSound('order', {
                table_name: newOrder?.table_name || 'N/A',
              });
            }
          }
          
          prevOrderIds.current = newIds;
          setOrderNotifications(data.recent_orders.map((o: any) => ({
            id: o.id,
            table_name: o.table_name,
            total: o.total,
            status: o.status,
            created_at: o.created_at || o.createdAt,
          })));
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
      }
    };
    
    fetchOrders();
    const interval = setInterval(fetchOrders, 15000);
    return () => clearInterval(interval);
  }, []);

  // Fetch real waiter calls from backend
  useEffect(() => {
    const fetchWaiterCalls = async () => {
      try {
        console.log("🔄 Fetching waiter calls...");
        const token = localStorage.getItem("adminAccessToken");
        const res = await fetch(`${getApiUrl()}/api/waiter_call/active/`, {
          headers: token ? { "Authorization": `Bearer ${token}` } : {},
          credentials: "include",
        });
        if (!res.ok) {
          console.log("❌ Waiter calls fetch failed:", res.status, res.statusText);
          return;
        }
        const data = await res.json();
        console.log("📋 Raw waiter calls data:", data);
        
        const newIds = data.map((c: any) => c.id);
        
        console.log("🔍 Waiter calls analysis:", {
          isInitialLoad: isInitialLoad.current,
          prevIds: prevWaiterIds.current,
          newIds: newIds,
          prevCount: prevWaiterIds.current.length,
          newCount: newIds.length,
          hasNewCalls: newIds.some((id: number) => !prevWaiterIds.current.includes(id)),
          newCallIds: newIds.filter((id: number) => !prevWaiterIds.current.includes(id))
        });
        
        // Play waiter sound if new waiter call detected (skip on initial load)
        if (!isInitialLoad.current && newIds.length > 0) {
          const hasNewWaiterCall = newIds.some((id: number) => !prevWaiterIds.current.includes(id));
          if (hasNewWaiterCall) {
            const newCall = data.find((c: any) => !prevWaiterIds.current.includes(c.id));
            playNotificationSound('waiter', {
              table_name: newCall?.table_name || 'N/A',
            });
          } else {
            console.log("ℹ️ No new waiter calls detected");
          }
        } else {
          console.log("⏭️ Skipping waiter call sound check:", {
            isInitialLoad: isInitialLoad.current,
            newIdsLength: newIds.length
          });
        }
        
        prevWaiterIds.current = newIds;
        setWaiterCalls(data);
        console.log("✅ Waiter calls updated, new count:", data.length);
      } catch (error) {
        console.error("❌ Error fetching waiter calls:", error);
      }
    };
    
    fetchWaiterCalls();
    const interval = setInterval(fetchWaiterCalls, 15000);
    return () => clearInterval(interval);
  }, []);

  const [readOrderIds, setReadOrderIds] = useState<string[]>([])
  const [readPaymentIds, setReadPaymentIds] = useState<string[]>([])

  const markOrderAsRead = (id: string) => setReadOrderIds((prev) => [...prev, id])
  const markPaymentAsRead = (id: string) => setReadPaymentIds((prev) => [...prev, id])

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <Check className="h-4 w-4 text-green-500" />
      case "pending":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case "failed":
      case "cancelled":
        return <X className="h-4 w-4 text-red-500" />
      case "in-progress":
        return <ListOrdered className="h-4 w-4 text-blue-500" />
      default:
        return null
    }
  }

  const unreadPayments = notifications.filter(n => !readPaymentIds.includes(n.id)).length
  const unreadOrders = orderNotifications.filter(o => !readOrderIds.includes(o.id)).length
  const unreadWaiterCalls = waiterCalls.length
  const unreadCount = activeTab === 'payments' ? unreadPayments : activeTab === 'orders' ? unreadOrders : unreadWaiterCalls

  const resolveWaiterCall = async (id: number) => {
    try {
      const res = await fetch(`${getApiUrl()}/api/waiter_call/${id}/resolve/`, { method: 'POST' })
      if (res.ok) {
        setWaiterCalls((prev) => prev.filter((c) => c.id !== id))
        toast({ title: 'Waiter call resolved', description: `Table call marked as resolved.` })
      }
    } catch {}
  }

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" className="relative" onClick={() => setShowNotifications(!showNotifications)}>
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-orange-600">
            {unreadCount}
          </Badge>
        )}
      </Button>
      
      {showNotifications && (
        <Card className="absolute right-0 mt-2 w-96 z-50 shadow-lg overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border-b border-orange-100 dark:border-orange-900 flex justify-between items-center">
            <div className="flex gap-2">
              <Button variant={activeTab === 'payments' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('payments')} className="text-orange-600 dark:text-orange-400">
                <CreditCard className="h-4 w-4 mr-1" /> Payments
              </Button>
              <Button variant={activeTab === 'orders' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('orders')} className="text-orange-600 dark:text-orange-400">
                <ListOrdered className="h-4 w-4 mr-1" /> Orders
              </Button>
              <Button variant={activeTab === 'waiter_calls' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('waiter_calls')} className="text-orange-600 dark:text-orange-400">
                <Bell className="h-4 w-4 mr-1 text-orange-600 dark:text-orange-400" /> Waiter Calls
              </Button>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-zinc-500 dark:text-zinc-300" onClick={() => setShowNotifications(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="max-h-[400px] overflow-y-auto bg-white dark:bg-zinc-900">
            {activeTab === 'payments' ? (
              notifications.filter(n => !readPaymentIds.includes(n.id)).slice(0, 20).length === 0 ? (
                <div className="p-4 text-center text-zinc-500 dark:text-zinc-400">
                  <p>No new payments</p>
                </div>
              ) : (
                notifications.filter(n => !readPaymentIds.includes(n.id)).slice(0, 20).map((notification) => (
                  <div key={notification.id} className="p-3 border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-start bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
                    <div className="flex-1">
                      <div className="flex items-center gap-1">
                        {getStatusIcon(notification.status)}
                        <p className="font-medium text-sm">
                          Table {notification.tableNumber} - Rs {notification.amount.toFixed(2)}
                        </p>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                        {notification.paymentMethod} • {formatTime(notification.timestamp)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-zinc-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400"
                      onClick={() => markPaymentAsRead(notification.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))
              )
            ) : activeTab === 'orders' ? (
              orderNotifications.filter(o => !readOrderIds.includes(o.id)).slice(0, 20).length === 0 ? (
                <div className="p-4 text-center text-zinc-500 dark:text-zinc-400">
                  <p>No new orders</p>
                </div>
              ) : (
                orderNotifications.filter(o => !readOrderIds.includes(o.id)).slice(0, 20).map((order) => (
                  <div key={order.id} className="p-3 border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-start bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
                    <div className="flex-1">
                      <div className="flex items-center gap-1">
                        {getStatusIcon(order.status)}
                        <p className="font-medium text-sm">
                          Table {order.table_name} - Rs {(() => {
                            let total = order.total;
                            if (typeof total === 'string') {
                              total = total.replace(/[^\d.]/g, '');
                            }
                            if (typeof total !== 'number' && typeof total !== 'string') {
                              return '0.00';
                            }
                            const num = Number(total);
                            return isNaN(num) ? '0.00' : num.toFixed(2);
                          })()}
                        </p>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)} • {formatTime(order.created_at)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-zinc-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400"
                      onClick={() => markOrderAsRead(order.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))
              )
            ) : activeTab === 'waiter_calls' ? (
              waiterCalls.length === 0 ? (
                <div className="p-4 text-center text-zinc-500 dark:text-zinc-400">
                  <p>No active waiter calls</p>
                </div>
              ) : (
                waiterCalls.map((call) => (
                  <div key={call.id} className="p-3 border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-start bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
                    <div className="flex-1">
                      <div className="flex items-center gap-1">
                        <Bell className="h-4 w-4 text-orange-500" />
                        <p className="font-medium text-sm">
                          Table {call.table_name} is calling for a waiter
                        </p>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                        {formatTime(call.created_at)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 py-0 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-semibold"
                      onClick={() => resolveWaiterCall(call.id)}
                    >
                      Resolve
                    </Button>
                  </div>
                ))
              )
            ) : null}
          </div>
          <div className="p-2 bg-zinc-50 dark:bg-zinc-900/40 border-t border-zinc-100 dark:border-zinc-800 text-center flex justify-between">
            <Button variant="link" size="sm" className="text-xs text-orange-600 dark:text-orange-400" onClick={() => setActiveTab('payments')}>
              View All Payments
            </Button>
            <Button variant="link" size="sm" className="text-xs text-orange-600 dark:text-orange-400" onClick={() => setActiveTab('orders')}>
              View All Orders
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
