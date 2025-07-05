"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { getApiUrl } from '../../../lib/api-service';

interface WaiterCall {
  id: number;
  table_name: string;
  created_at: string;
}

interface WaiterCallNotificationProps {
  showResolve?: boolean;
  orderId?: string;
}

export default function WaiterCallNotification({ showResolve = false, orderId }: WaiterCallNotificationProps) {
  const [waiterCalls, setWaiterCalls] = useState<WaiterCall[]>([]);

  // Poll waiter calls
  const fetchWaiterCalls = async () => {
    try {
      let url = `${getApiUrl()}/api/waiter_call/active/`;
      // If orderId is provided, fetch the order to get table_id
      if (orderId) {
        const orderRes = await fetch(`${getApiUrl()}/api/orders/${orderId}/`);
        if (!orderRes.ok) return;
        const orderData = await orderRes.json();
        const tableId = orderData.table || orderData.table_id;
        if (tableId) {
          url += `?table_id=${tableId}`;
        }
      }
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      setWaiterCalls(data);
    } catch {}
  };


  useEffect(() => {
    fetchWaiterCalls();
    const interval = setInterval(fetchWaiterCalls, 15000);
    return () => clearInterval(interval);
  }, []);

  const resolveWaiterCall = async (id: number) => {
    try {
      const res = await fetch(`${getApiUrl()}/api/waiter_call/${id}/resolve/`, { method: "POST" });
      if (res.ok) {
        setWaiterCalls((prev) => prev.filter((c) => c.id !== id));
      }
    } catch {}
  };

  if (!waiterCalls.length) return null;

  return (
    <div className="bg-orange-100 border-l-4 border-orange-500 p-4 mb-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 mb-1">
        <Bell className="h-5 w-5 text-orange-600" />
        <span className="font-semibold text-orange-900">Waiter Call Notification</span>
      </div>
      {waiterCalls.map((call) => (
        <div key={call.id} className="flex items-center gap-4">
          <span className="text-orange-800 font-medium">Table {call.table_name} is calling for a waiter</span>
          <span className="text-xs text-gray-600">{new Date(call.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          {showResolve && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-20 p-0 text-green-700 border-green-600 ml-2"
              onClick={() => resolveWaiterCall(call.id)}
            >
              Resolve
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
