"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Download, MoreHorizontal, CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
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
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { useLoading } from '@/contexts/LoadingContext'
import { getApiUrl } from '@/lib/api-service';

type Payment = {
  id: string
  customer: string
  amount: string
  status: "completed" | "pending" | "failed" | "refunded" | "esewa"
  method: string
  date: string
  order_id: string
  order_items?: any[]
}

type FilterState = {
  status: string
  method: string
  minAmount: string
  maxAmount: string
}

type SortState = {
  key: "amount" | "date"
  order: "asc" | "desc"
}

export default function PaymentsPage() {
  const { setShow } = useLoading();
  useEffect(() => { setShow(false); }, [setShow]);
  const [payments, setPayments] = useState<Payment[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterDialogOpen, setFilterDialogOpen] = useState(false)
  const [sortDialogOpen, setSortDialogOpen] = useState(false)
  const [viewDetailsDialogOpen, setViewDetailsDialogOpen] = useState(false)
  const [refundDialogOpen, setRefundDialogOpen] = useState(false)
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [filters, setFilters] = useState<FilterState>({
    status: "all",
    method: "all",
    minAmount: "",
    maxAmount: "",
  })
  const [sort, setSort] = useState<SortState>({
    key: "date",
    order: "desc",
  })
  const [isClient, setIsClient] = useState(false)
  const [extraCharges, setExtraCharges] = useState<{ id: number; label: string; amount: number }[]>([])
  const [newCharge, setNewCharge] = useState<{ label: string; amount: number }>({ label: '', amount: 0 })
  const [csrfToken, setCsrfToken] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<{ id: string, timeout: NodeJS.Timeout } | null>(null)
  const [pendingBulkDelete, setPendingBulkDelete] = useState<{ ids: string[], timeout: NodeJS.Timeout } | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const paymentsRef = useRef<Payment[]>([])

  // Fetch payments data
  const fetchPayments = async () => {
    setIsRefreshing(true)
    try {
      const { accessToken } = await getAuthTokens();
      if (!accessToken) {
        window.location.href = '/admin/login';
        return;
      }

      const response = await makeAuthenticatedRequest(`${getApiUrl()}/api/payments/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response) return;
      if (!response.ok) throw new Error('Failed to fetch payments');

      const data = await response.json();
      setPayments(data.map((payment: any) => ({
        id: payment.id,
        customer: `Table ${payment.order?.table || 'N/A'}`,
        amount: `Rs ${payment.amount}`,
        status: payment.status.toLowerCase(),
        method: payment.payment_method || 'Unknown',
        date: payment.created_at,
        order_id: payment.order?.id || '',
        order_items: payment.order?.items || [],
      })));
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error("Failed to fetch payments. Please try again.");
    } finally {
      setIsRefreshing(false)
    }
  };

  // Fetch payments on mount and set up polling
  useEffect(() => {
    fetchPayments();
    const interval = setInterval(fetchPayments, 60000); // Poll every 1 minute
    return () => clearInterval(interval);
  }, []);

  // Ensure client-side rendering for dynamic content
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Add this new function to check token expiration
  const isTokenExpired = (token: string) => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expirationTime = payload.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      // Refresh token if it's within 1 hour of expiring
      return currentTime >= (expirationTime - 60 * 60 * 1000);
    } catch (error) {
      return true;
    }
  };

  // Modify the getAuthTokens function to be more resilient
  const getAuthTokens = async () => {
    if (typeof window !== 'undefined') {
      const accessToken = localStorage.getItem('adminAccessToken');
      const refreshToken = localStorage.getItem('adminRefreshToken');

      if (!accessToken || !refreshToken) {
        return { accessToken: null, refreshToken: null };
      }

      try {
        if (isTokenExpired(accessToken)) {
          const newAccessToken = await refreshAccessToken();
          if (newAccessToken) {
            return { accessToken: newAccessToken, refreshToken };
          }
        }
        return { accessToken, refreshToken };
      } catch (error) {
        console.error('Error in getAuthTokens:', error);
        return { accessToken, refreshToken }; // Return existing tokens even if refresh fails
      }
    }
    return { accessToken: null, refreshToken: null };
  };

  // Modify refreshAccessToken to be more resilient
  const refreshAccessToken = async () => {
    try {
      const refreshToken = localStorage.getItem('adminRefreshToken');
      if (!refreshToken) {
        return null;
      }

      const response = await fetch(`${getApiUrl()}/api/authentaction/token/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (!response.ok) {
        // Try to get new tokens
        const newTokensResponse = await fetch(`${getApiUrl()}/api/authentaction/token/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refresh: refreshToken }),
        });

        if (!newTokensResponse.ok) {
          return null;
        }

        const newTokens = await newTokensResponse.json();
        localStorage.setItem('adminAccessToken', newTokens.access);
        localStorage.setItem('adminRefreshToken', newTokens.refresh);
        return newTokens.access;
      }

      const data = await response.json();
      localStorage.setItem('adminAccessToken', data.access);
      return data.access;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return null;
    }
  };

  // Modify makeAuthenticatedRequest to be more resilient
  const makeAuthenticatedRequest = async (url: string, options: RequestInit) => {
    try {
      const { accessToken } = await getAuthTokens();
      if (!accessToken) {
        return null;
      }

      const headers = {
        ...options.headers,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(url, { ...options, headers });
      
      if (response.status === 401) {
        const newAccessToken = await refreshAccessToken();
        if (!newAccessToken) {
          return null;
        }
        const newHeaders = {
          ...options.headers,
          'Authorization': `Bearer ${newAccessToken}`,
          'Content-Type': 'application/json',
        };
        return fetch(url, { ...options, headers: newHeaders });
      }

      return response;
    } catch (error) {
      console.error('Request error:', error);
      return null;
    }
  };

  // Fetch CSRF token on mount to set CSRF cookie
  useEffect(() => {
    fetch(`${getApiUrl()}/api/csrf/`, {
      credentials: "include",
    }).then(res => {
      // Extract CSRF token from cookies if available
      const cookies = document.cookie.split('; ');
      const csrfCookie = cookies.find(cookie => cookie.startsWith('csrftoken='));
      if (csrfCookie) {
        setCsrfToken(csrfCookie.split('=')[1]);
      }
    }).catch((err) => console.error("Failed to fetch CSRF token:", err));
  }, []);

  // Fetch extra charges on mount and when needed
  useEffect(() => {
    const fetchCharges = async () => {
      try {
        setIsLoading(true);
        const res = await makeAuthenticatedRequest(`${getApiUrl()}/api/extra-charges/`, {
          method: 'GET',
          headers: {
            'X-CSRFToken': csrfToken,
          },
          credentials: 'include'
        });

        if (!res) {
          // If request failed, retry once after a short delay
          await new Promise(resolve => setTimeout(resolve, 1000));
          const retryRes = await makeAuthenticatedRequest(`${getApiUrl()}/api/extra-charges/`, {
            method: 'GET',
            headers: {
              'X-CSRFToken': csrfToken,
            },
            credentials: 'include'
          });
          
          if (!retryRes) {
            setExtraCharges([]);
            return;
          }

          if (!retryRes.ok) {
            throw new Error('Failed to fetch extra charges');
          }

          const data = await retryRes.json();
          setExtraCharges(Array.isArray(data) ? data : []);
          return;
        }

        if (!res.ok) {
          throw new Error('Failed to fetch extra charges');
        }

        const data = await res.json();
        setExtraCharges(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching extra charges:', error);
        setExtraCharges([]);
      } finally {
        setIsLoading(false);
      }
    };

    // Fetch charges on mount and when csrfToken is available
    fetchCharges();
  }, []); // Remove csrfToken dependency to make it more reliable

  // Function to refresh extra charges
  const refreshExtraCharges = async () => {
    try {
      const res = await makeAuthenticatedRequest(`${getApiUrl()}/api/extra-charges/`, {
        method: 'GET',
        headers: {
          'X-CSRFToken': csrfToken,
        },
        credentials: 'include'
      });

      if (res && res.ok) {
        const data = await res.json();
        setExtraCharges(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error refreshing extra charges:', error);
    }
  };

  // Add a function to handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const { accessToken } = await getAuthTokens();
        if (accessToken && isTokenExpired(accessToken)) {
          await refreshAccessToken();
        }
        // Refresh extra charges when page becomes visible
        await refreshExtraCharges();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Add a function to handle window focus
  useEffect(() => {
    const handleFocus = async () => {
      const { accessToken } = await getAuthTokens();
      if (accessToken && isTokenExpired(accessToken)) {
        await refreshAccessToken();
      }
      // Refresh extra charges when window gains focus
      await refreshExtraCharges();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }

  const handleExport = () => {
    const csvContent = [
      ["Payment ID", "Customer", "Amount", "Status", "Method", "Date", "Order ID"],
      ...payments.map((payment) => [
        payment.id,
        payment.customer,
        payment.amount,
        payment.status,
        payment.method,
        formatDate(payment.date),
        payment.order_id,
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = "payments_export.csv"
    link.click()
    URL.revokeObjectURL(link.href)

    toast.success("Payment data has been exported as CSV.")
  }

  const handleRetryPayment = (paymentId: string) => {
    setPayments(
      payments.map((payment) =>
        payment.id === paymentId && payment.status === "failed"
          ? { ...payment, status: "pending" }
          : payment
      )
    )
    toast.success(`Payment ${paymentId} is being reprocessed.`)
  }

  const handleRefundPayment = () => {
    if (!selectedPayment) return
    setPayments(
      payments.map((payment) =>
        payment.id === selectedPayment.id && payment.status === "completed"
          ? { ...payment, status: "refunded" }
          : payment
      )
    )
    setRefundDialogOpen(false)
    toast.success(`Payment ${selectedPayment.id} has been refunded.`)
    setSelectedPayment(null)
  }

  const handlePrintReceipt = (payment: Payment) => {
    const receiptWindow = window.open('', '_blank')
    if (receiptWindow) {
      // Calculate subtotal from items
      const subtotal = payment.order_items?.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0) || 0
      
      // Get extra charges from the payment amount
      const totalAmount = parseFloat(payment.amount.replace('Rs', '').trim())
      const extraCharges = totalAmount - subtotal

      receiptWindow.document.write(`
        <html>
          <head>
            <title>Receipt - ${payment.id}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; max-width: 400px; margin: 0 auto; }
              h1 { text-align: center; font-size: 24px; margin-bottom: 20px; }
              .receipt { border: 1px solid #ccc; padding: 20px; }
              .header { text-align: center; margin-bottom: 20px; }
              .item { display: flex; justify-content: space-between; margin: 10px 0; }
              .subtotal { border-top: 1px solid #ccc; padding-top: 10px; margin-top: 10px; }
              .total { font-weight: bold; border-top: 2px solid #000; padding-top: 10px; margin-top: 10px; }
              .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
              .extra-charges { margin: 10px 0; }
              .extra-charges .item { color: #666; }
            </style>
          </head>
          <body>
            <div class="receipt">
              <div class="header">
                <h1>Restaurant Receipt</h1>
                <p>Thank you for dining with us!</p>
              </div>
              <p><strong>Payment ID:</strong> ${payment.id}</p>
              <p><strong>Customer:</strong> ${payment.customer}</p>
              <p><strong>Date:</strong> ${new Date(payment.date).toLocaleString()}</p>
              <p><strong>Method:</strong> ${payment.method}</p>
              <p><strong>Status:</strong> ${payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}</p>
              
              <h3>Items Ordered:</h3>
              ${payment.order_items?.map(item => `
                <div class="item">
                  <span>${item.name} x ${item.quantity}</span>
                  <span>Rs. ${(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                </div>
              `).join('') || '<p>No items found</p>'}
              
              <div class="subtotal">
                <div class="item">
                  <span>Subtotal</span>
                  <span>Rs. ${subtotal.toFixed(2)}</span>
                </div>
              </div>

              ${extraCharges > 0 ? `
                <div class="extra-charges">
                  <h4>Extra Charges:</h4>
                  <div class="item">
                    <span>Service Charge & VAT</span>
                    <span>Rs. ${extraCharges.toFixed(2)}</span>
                  </div>
                </div>
              ` : ''}

              <div class="total">
                <div class="item">
                  <span>Total Amount</span>
                  <span>Rs. ${totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div class="footer">
              <p>Thank you for your business!</p>
              <p>Please keep this receipt for your records</p>
            </div>
          </body>
        </html>
      `)
      receiptWindow.document.close()
      receiptWindow.print()
    }
  }

  const applyFiltersAndSort = useMemo(() => {
    return (data: Payment[], tab: string) => {
      if (!isClient) return data // Avoid filtering/sorting during SSR

      let filtered = [...data]

      // Apply tab-specific filtering
      if (tab !== "all") {
        filtered = filtered.filter((payment) => payment.status === tab)
      }

      // Apply search query
      if (searchQuery) {
        filtered = filtered.filter(
          (payment) =>
            payment.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            payment.customer.toLowerCase().includes(searchQuery.toLowerCase())
        )
      }

      // Apply filters
      if (filters.status !== "all") {
        filtered = filtered.filter((payment) => payment.status === filters.status)
      }
      if (filters.method !== "all") {
        filtered = filtered.filter((payment) => payment.method === filters.method)
      }
      if (filters.minAmount) {
        const min = parseFloat(filters.minAmount.replace("Rs", ""))
        filtered = filtered.filter((payment) => parseFloat(payment.amount.replace("Rs", "")) >= min)
      }
      if (filters.maxAmount) {
        const max = parseFloat(filters.maxAmount.replace("Rs", ""))
        filtered = filtered.filter((payment) => parseFloat(payment.amount.replace("Rs", "")) <= max)
      }

      // Apply sorting
      filtered.sort((a, b) => {
        const multiplier = sort.order === "asc" ? 1 : -1
        if (sort.key === "amount") {
          const aAmount = parseFloat(a.amount.replace("Rs", ""))
          const bAmount = parseFloat(b.amount.replace("Rs", ""))
          return multiplier * (aAmount - bAmount)
        } else {
          const aDate = new Date(a.date).getTime()
          const bDate = new Date(b.date).getTime()
          return multiplier * (aDate - bDate)
        }
      })

      return filtered
    }
  }, [isClient, searchQuery, filters, sort])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="mr-1 h-3 w-3" />
            Paid
          </Badge>
        )
      case 'unpaid':
        return (
          <Badge variant="destructive" className="bg-red-500">
            <XCircle className="mr-1 h-3 w-3" />
            Unpaid
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary">
            <Clock className="mr-1 h-3 w-3" />
            {status}
          </Badge>
        )
    }
  }

  const renderPaymentTable = (tab: string) => (
    <Card>
      <CardHeader>
        <CardTitle>{tab.charAt(0).toUpperCase() + tab.slice(1)} Payments</CardTitle>
        <CardDescription>
          {tab === "all" ? "A list of all payment transactions." : `List of ${tab} payment transactions.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableCaption>
            {tab === "all" ? "A list of all payment transactions." : `List of ${tab} payment transactions.`}
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Payment ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applyFiltersAndSort(payments, tab).map((payment) => (
              < TableRow key = { payment.id } >
                <TableCell className="font-medium">{payment.id}</TableCell>
                <TableCell>{payment.customer}</TableCell>
                <TableCell>{payment.amount}</TableCell>
                <TableCell>{payment.method}</TableCell>
                <TableCell>{getStatusBadge(payment.status)}</TableCell>
                <TableCell>{formatDate(payment.date)}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedPayment(payment)
                          setViewDetailsDialogOpen(true)
                        }}
                      >
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handlePrintReceipt(payment)}>
                        Print Receipt
                      </DropdownMenuItem>
                      {payment.status === "failed" && (
                        <DropdownMenuItem onClick={() => handleRetryPayment(payment.id)}>
                          <RefreshCw className="mr-2 h-4 w-4" /> Retry Payment
                        </DropdownMenuItem>
                      )}
                      {payment.status === "completed" && (
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedPayment(payment)
                            setRefundDialogOpen(true)
                          }}
                          className="text-red-600"
                        >
                          Refund Payment
                        </DropdownMenuItem>
                      )}
                      
                      <DropdownMenuItem
                        onClick={() => handleDeletePayment(payment.id)}
                        className="text-red-600"
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )

  // Modify handleAddCharge to use async getAuthTokens
  const handleAddCharge = async () => {
    if (!newCharge.label || isNaN(newCharge.amount) || newCharge.amount <= 0) return;
    setIsLoading(true);
    const { accessToken } = await getAuthTokens();
    if (!accessToken) {
      window.location.href = '/admin/login';
      return;
    }

    try {
      const res = await makeAuthenticatedRequest(`${getApiUrl()}/api/extra-charges/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify(newCharge),
      });

      if (!res) return;
      if (!res.ok) throw new Error('Failed to add charge');
      const created = await res.json();
      setExtraCharges(prev => [...prev, created]);
      setNewCharge({ label: '', amount: 0 });
      toast.success("Extra charge added successfully.");
      refreshExtraCharges(); // Refresh charges after adding
    } catch (error) {
      console.error('Error adding charge:', error);
      toast.error("Failed to add extra charge. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Modify handleRemoveCharge to use async getAuthTokens
  const handleRemoveCharge = async (idx: number) => {
    const charge = extraCharges[idx];
    if (!charge || !charge.id) return;
    setIsLoading(true);
    const { accessToken } = await getAuthTokens();
    if (!accessToken) {
      window.location.href = '/admin/login';
      return;
    }

    try {
      const res = await makeAuthenticatedRequest(`${getApiUrl()}/api/extra-charges/${charge.id}/`, { 
        method: 'DELETE',
        headers: {
          'X-CSRFToken': csrfToken,
        },
        credentials: 'include'
      });

      if (!res) return;
      if (!res.ok) throw new Error('Failed to remove charge');
      setExtraCharges(prev => prev.filter((_, i) => i !== idx));
      toast.success("Extra charge removed successfully.");
      refreshExtraCharges(); // Refresh charges after removing
    } catch (error) {
      console.error('Error removing charge:', error);
      toast.error("Failed to remove extra charge. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (paymentId: string) => {
    try {
      const { accessToken } = await getAuthTokens();
      if (!accessToken) return;

      const response = await makeAuthenticatedRequest(
        `${getApiUrl()}/api/payments/${paymentId}/toggle-status/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response && response.ok) {
        const updatedPayment = await response.json();
        setPayments(prevPayments =>
          prevPayments.map(p =>
            p.id === paymentId ? { ...p, status: updatedPayment.status.toLowerCase() } : p
          )
        );
        toast.success(`Payment status updated to ${updatedPayment.status}`);
      } else {
        toast.error("Failed to update payment status.");
      }
    } catch (error) {
      console.error("Error toggling payment status:", error);
      toast.error("An error occurred while updating payment status.");
    }
  };

  const handleCancelPayment = async (paymentId: string) => {
    try {
      const response = await makeAuthenticatedRequest(
        `${getApiUrl()}/api/payments/cancel-payment/${paymentId}/`,
        { method: 'POST' }
      );

      if (response && response.ok) {
        const updatedPayment = await response.json();
        setPayments(prevPayments =>
          prevPayments.map(p =>
            p.id === paymentId ? { ...p, status: updatedPayment.status.toLowerCase() } : p
          )
        );
        toast.success("Payment has been cancelled.");
      } else {
        const errorData = response ? await response.json() : { detail: "An unknown error occurred." };
        toast.error(`Failed to cancel payment: ${errorData.detail}`);
      }
    } catch (error) {
      console.error("Error cancelling payment:", error);
      toast.error("An error occurred while cancelling the payment.");
    }
  };

  const PaymentDetailsDialog = ({ payment, onClose }: { payment: Payment & { amount: number | string }, onClose: () => void }) => {
    // Format amount to ensure it's a number and has 2 decimal places
    const rawAmount = typeof payment.amount === 'string' ? payment.amount.replace(/[^0-9.]/g, '') : payment.amount;
    const formattedAmount = !isNaN(Number(rawAmount)) ? Number(rawAmount).toFixed(2) : '0.00';

    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
            <DialogDescription>
              View payment and order information
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Customer</Label>
              <div className="col-span-3">{payment.customer}</div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Amount</Label>
              <div className="col-span-3">Rs. {formattedAmount}</div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Date</Label>
              <div className="col-span-3">{new Date(payment.date).toLocaleString()}</div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Status</Label>
              <div className="col-span-3">{getStatusBadge(payment.status)}</div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Method</Label>
              <div className="col-span-3">{payment.method}</div>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right">Order Details</Label>
              <div className="col-span-3">
                <div className="space-y-2">
                  <div className="font-medium">Order #{payment.order_id}</div>
                  {payment.order_items && payment.order_items.length > 0 ? (
                    <>
                      <div className="text-sm text-gray-500">
                        {payment.order_items.map((item: any, index: number) => (
                          <div key={index} className="flex justify-between py-1">
                            <span>{item.name} x {item.quantity}</span>
                            <span>Rs. {parseFloat(item.price).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between font-medium">
                          <span>Total</span>
                          <span>Rs. {formattedAmount}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-gray-500">No items found in this order</div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // Single delete (with pre-delete toast confirmation)
  const handleDeletePayment = (paymentId: string) => {
    toast(
      "Are you sure you want to delete this payment?",
      {
        duration: 5000,
        action: {
          label: 'Delete',
          onClick: async () => {
            // Remove from UI immediately
            const newPayments = payments.filter(p => p.id !== paymentId)
            setPayments(newPayments)
            paymentsRef.current = newPayments

            try {
              const { accessToken } = await getAuthTokens();
              if (!accessToken) {
                window.location.href = '/admin/login';
                return;
              }

              const response = await makeAuthenticatedRequest(`${getApiUrl()}/api/payments/${paymentId}/`, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                },
              });

              if (!response) return;
              if (!response.ok) throw new Error('Failed to delete payment');
              toast.success("Payment deleted successfully.");
              fetchPayments();
            } catch (error) {
              console.error('Error deleting payment:', error);
              toast.error("Failed to delete payment. Please try again.");
              // Optionally restore the payment in UI if delete failed
              setPayments([...payments, paymentsRef.current.find(p => p.id === paymentId)].filter((p): p is Payment => Boolean(p)))
              paymentsRef.current = payments
            }
          }
        }
      }
    )
  }

  // Bulk delete (with pre-delete toast confirmation)
  const handleDeleteAllPayments = () => {
    toast(
      "Are you sure you want to delete ALL payments?",
      {
        duration: 5000,
        action: {
          label: 'Delete All',
          onClick: async () => {
            setPayments([])
            paymentsRef.current = []

            try {
              const { accessToken } = await getAuthTokens();
              if (!accessToken) {
                window.location.href = '/admin/login';
                return;
              }

              const response = await makeAuthenticatedRequest(`${getApiUrl()}/api/payments/delete_all/`, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                },
              });

              if (!response) return;
              if (!response.ok) throw new Error('Failed to delete all payments');
              toast.success("All payments deleted successfully.");
              fetchPayments();
            } catch (error) {
              console.error('Error deleting all payments:', error);
              toast.error("Failed to delete all payments. Please try again.");
              // Optionally restore the payments in UI if delete failed
              // (You can keep a backup if you want to restore)
            }
          }
        }
      }
    )
  }

  if (isRefreshing) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <RefreshCw className="h-10 w-10 text-orange-500 animate-spin mb-4" />
        <p className="text-lg font-semibold">Please wait…</p>
        <p className="text-sm text-gray-500">Loading section, this may take a few seconds.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 bg-background text-foreground px-2 sm:px-6 py-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:w-auto">
          <h2 className="text-3xl font-bold tracking-tight">Payments</h2>
          <p className="text-muted-foreground">
            View and manage all payments.
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            {isRefreshing && (
              <RefreshCw className="h-4 w-4 animate-spin" />
            )}
            {lastUpdated && (
              <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
            )}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button onClick={handleExport} className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteAllPayments}
            className="w-full sm:w-auto"
          >
            Delete All Payments
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search payments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-full"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => setFilterDialogOpen(true)}
            className="w-full sm:w-auto"
          >
            Filter
          </Button>
          <Button
            variant="outline"
            onClick={() => setSortDialogOpen(true)}
            className="w-full sm:w-auto"
          >
            Sort
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Extra Charges</CardTitle>
              <CardDescription>
                Manage extra charges like Service Fee, VAT, etc. These will be shown to customers during checkout.
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshExtraCharges}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            {isLoading ? (
              <div>Loading charges...</div>
            ) : extraCharges.length === 0 ? (
              <p>No extra charges added yet.</p>
            ) : (
              extraCharges.map((charge, idx) => (
                <div key={charge.id} className="flex items-center gap-2 bg-muted px-3 py-1 rounded-full text-sm">
                  <span>{charge.label}: <span className="font-bold">Rs {(Number(charge.amount)).toFixed(2)}</span></span>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={() => handleRemoveCharge(idx)}
                    disabled={isLoading}
                    className="h-6 w-6"
                  >
                    <span className="text-red-500">&times;</span>
                  </Button>
                </div>
              ))
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 items-end w-full">
            <div className="w-full sm:w-auto flex-1">
              <Label htmlFor="charge-label" className="sr-only">Label</Label>
              <Input
                id="charge-label"
                placeholder="Label (e.g. Service Fee)"
                value={newCharge.label}
                onChange={e => setNewCharge({ ...newCharge, label: e.target.value })}
                className="w-full"
                disabled={isLoading}
              />
            </div>
            <div className="w-full sm:w-auto">
              <Label htmlFor="charge-amount" className="sr-only">Amount</Label>
              <Input
                id="charge-amount"
                type="number"
                placeholder="Amount"
                value={newCharge.amount}
                onChange={e => setNewCharge({ ...newCharge, amount: Number(e.target.value) })}
                className="w-full"
                min="0"
                step="0.01"
                disabled={isLoading}
              />
            </div>
            <Button 
              onClick={handleAddCharge} 
              disabled={isLoading || !newCharge.label || isNaN(newCharge.amount) || newCharge.amount <= 0}
              className="w-full sm:w-auto"
            >
              {isLoading ? "Adding..." : "Add Charge"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Payments</TabsTrigger>
          <TabsTrigger value="esewa">eSewa</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          <Card className="border">
            <CardHeader>
              <CardTitle>All Payments</CardTitle>
              <CardDescription>
                A list of all payments in your restaurant.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                {renderPaymentTable("all")}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="esewa" className="mt-4">
          <Card className="border">
            <CardHeader>
              <CardTitle>eSewa Payments</CardTitle>
              <CardDescription>
                A list of all eSewa payments in your restaurant.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                {renderPaymentTable("esewa")}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Details Dialog */}
      <Dialog open={viewDetailsDialogOpen} onOpenChange={setViewDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[425px] w-full max-w-full px-2">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
            <DialogDescription>Details of the selected payment transaction.</DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <PaymentDetailsDialog payment={selectedPayment} onClose={() => setViewDetailsDialogOpen(false)} />
          )}
        </DialogContent>
      </Dialog>

      {/* Refund Confirmation Dialog */}
      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent className="sm:max-w-[425px] w-full max-w-full px-2">
          <DialogHeader>
            <DialogTitle>Refund Payment</DialogTitle>
            <DialogDescription>
              Are you sure you want to refund this payment? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="py-4">
              <p className="font-medium">{selectedPayment.id}</p>
              <p className="text-sm text-muted-foreground">{selectedPayment.customer} - {selectedPayment.amount}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRefundPayment}>
              Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filter Dialog */}
      <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
        <DialogContent className="sm:max-w-[425px] w-full max-w-full px-2">
          <DialogHeader>
            <DialogTitle>Filter Payments</DialogTitle>
            <DialogDescription>Apply filters to narrow down payment transactions.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label htmlFor="filter-status" className="text-right sm:col-span-1 col-span-1">
                Status
              </Label>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters({ ...filters, status: value })}
              >
                <SelectTrigger className="sm:col-span-3 col-span-1">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="esewa">eSewa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label htmlFor="filter-method" className="text-right sm:col-span-1 col-span-1">
                Method
              </Label>
              <Select
                value={filters.method}
                onValueChange={(value) => setFilters({ ...filters, method: value })}
              >
                <SelectTrigger className="sm:col-span-3 col-span-1">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="eSewa">eSewa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label htmlFor="filter-minAmount" className="text-right sm:col-span-1 col-span-1">
                Min Amount
              </Label>
              <Input
                id="filter-minAmount"
                type="number"
                step="0.01"
                value={filters.minAmount}
                onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
                className="sm:col-span-3 col-span-1"
                placeholder="Rs 0.00"
                min="0"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label htmlFor="filter-maxAmount" className="text-right sm:col-span-1 col-span-1">
                Max Amount
              </Label>
              <Input
                id="filter-maxAmount"
                type="number"
                step="0.01"
                value={filters.maxAmount}
                onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
                className="sm:col-span-3 col-span-1"
                placeholder="Rs 1000.00"
                min="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFilterDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setFilterDialogOpen(false)}>Apply Filters</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sort Dialog */}
      <Dialog open={sortDialogOpen} onOpenChange={setSortDialogOpen}>
        <DialogContent className="sm:max-w-[425px] w-full max-w-full px-2">
          <DialogHeader>
            <DialogTitle>Sort Payments</DialogTitle>
            <DialogDescription>Choose how to sort payment transactions.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label htmlFor="sort-key" className="text-right sm:col-span-1 col-span-1">
                Sort By
              </Label>
              <Select
                value={sort.key}
                onValueChange={(value) => setSort({ ...sort, key: value as "amount" | "date" })}
              >
                <SelectTrigger className="sm:col-span-3 col-span-1">
                  <SelectValue placeholder="Select sort key" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="amount">Amount</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label htmlFor="sort-order" className="text-right sm:col-span-1 col-span-1">
                Order
              </Label>
              <Select
                value={sort.order}
                onValueChange={(value) => setSort({ ...sort, order: value as "asc" | "desc" })}
              >
                <SelectTrigger className="sm:col-span-3 col-span-1">
                  <SelectValue placeholder="Select sort order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascending</SelectItem>
                  <SelectItem value="desc">Descending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSortDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setSortDialogOpen(false)}>Apply Sort</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}