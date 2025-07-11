"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  CreditCard, 
  Calendar, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  TrendingUp,
  FileText
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { fetchWithAuth, getApiUrl } from "@/lib/api-service"
import { useLoading } from '@/contexts/LoadingContext'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface SubscriptionData {
  id: string
  status: string
  trial_start_date: string
  trial_end_date: string
  subscription_start_date: string
  subscription_end_date: string
  monthly_fee: number
  currency: string
  last_payment_date: string
  next_payment_date: string
  is_trial_active: boolean
  is_subscription_active: boolean
  days_remaining_in_trial: number
  days_remaining_in_subscription: number
  admin_email: string
}

interface PaymentHistory {
  id: string
  payment_type: string
  amount: number
  currency: string
  is_successful: boolean
  created_at: string
  processed_at: string
  esewa_response_code: string
  esewa_response_message: string
  error_message: string
}

interface BillingHistory {
  id: string
  amount: number
  currency: string
  payment_method: string
  status: string
  billing_period_start: string
  billing_period_end: string
  created_at: string
  paid_at: string
  esewa_transaction_id: string
  esewa_reference_id: string
}

interface RefundRequest {
  id: string;
  admin: string;
  admin_email: string;
  billing_record: string;
  billing_record_id: string;
  reason: string;
  status: string;
  request_date: string;
  processed_date: string | null;
  processed_by: string | null;
  processed_by_email: string | null;
  response_message: string | null;
}

export default function BillingPage() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([])
  const [billingHistory, setBillingHistory] = useState<BillingHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { toast } = useToast()
  const { setShow } = useLoading()
  const router = useRouter();
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [selectedBillingId, setSelectedBillingId] = useState<string | null>(null);
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const fetchBillingData = async () => {
    try {
      setLoading(true)
      
      // Fetch subscription status
      const subscriptionResponse = await fetchWithAuth(`${getApiUrl()}/api/billing/subscription/status/`)
      if (!subscriptionResponse.ok) {
        throw new Error(`Failed to fetch subscription status: ${subscriptionResponse.status}`)
      }
      const subscriptionData = await subscriptionResponse.json()
      console.log('Subscription data received:', subscriptionData)
      setSubscription(subscriptionData)
      
      // Fetch payment history
      const paymentResponse = await fetchWithAuth(`${getApiUrl()}/api/billing/payment/history/`)
      if (!paymentResponse.ok) {
        throw new Error(`Failed to fetch payment history: ${paymentResponse.status}`)
      }
      const paymentData = await paymentResponse.json()
      setPaymentHistory(paymentData)
      
      // Fetch billing history
      const billingResponse = await fetchWithAuth(`${getApiUrl()}/api/billing/billing/history/`)
      if (!billingResponse.ok) {
        throw new Error(`Failed to fetch billing history: ${billingResponse.status}`)
      }
      const billingData = await billingResponse.json()
      setBillingHistory(billingData)
      
    } catch (error: any) {
      console.error('Error fetching billing data:', error)
      
      // Provide more specific error messages
      let errorMessage = "Failed to load billing information"
      
      if (error.message.includes('subscription status')) {
        errorMessage = "Failed to load subscription status. Please check your connection."
      } else if (error.message.includes('payment history')) {
        errorMessage = "Failed to load payment history. Please try again."
      } else if (error.message.includes('billing history')) {
        errorMessage = "Failed to load billing history. Please try again."
      } else if (error.message.includes('401')) {
        errorMessage = "Authentication required. Please log in again."
      } else if (error.message.includes('403')) {
        errorMessage = "Access denied. You don't have permission to view billing information."
      } else if (error.message.includes('404')) {
        errorMessage = "Billing information not found. Please contact support."
      } else if (error.message.includes('500')) {
        errorMessage = "Server error. Please try again later."
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchBillingData()
    await fetchRefundRequests() // Also refresh refund requests
    setRefreshing(false)
    toast({
      title: "Refreshed",
      description: "Billing information updated",
    })
  }

  // Fetch refund requests
  const fetchRefundRequests = async () => {
    try {
      const url = isSuperAdmin
        ? `${getApiUrl()}/api/billing/all-refund-requests/`
        : `${getApiUrl()}/api/billing/refund-requests/`;
      const res = await fetchWithAuth(url);
      if (res.ok) {
        const data = await res.json();
        setRefundRequests(data);
      }
    } catch (e) {
      // ignore
    }
  };

  // Check if user is superadmin (for demo, check localStorage)
  useEffect(() => {
    const userData = localStorage.getItem("adminUserData");
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        setIsSuperAdmin(!!parsed.is_superuser);
      } catch {}
    }
  }, []);

  useEffect(() => {
    setShow(false);
    fetchBillingData();
    fetchRefundRequests();
  }, [setShow, isSuperAdmin]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>
      case 'trial':
        return <Badge className="bg-blue-100 text-blue-800">Trial</Badge>
      case 'expired':
        return <Badge className="bg-red-100 text-red-800">Expired</Badge>
      case 'pending_payment':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending Payment</Badge>
      case 'cancelled':
        return <Badge className="bg-gray-100 text-gray-800">Cancelled</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>
    }
  }

  const getPaymentStatusBadge = (isSuccessful: boolean) => {
    return isSuccessful ? (
      <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        Successful
      </Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
        <XCircle className="h-3 w-3" />
        Failed
      </Badge>
    )
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString || dateString === 'null' || dateString === 'undefined') return "N/A"
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return "N/A"
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      console.error('Error formatting date:', dateString, error)
      return "N/A"
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'NPR'
    }).format(amount)
  }

  // Helper to get days remaining in subscription if not provided
  const getSubscriptionDaysRemaining = (sub: SubscriptionData) => {
    if (typeof sub.days_remaining_in_subscription === 'number') {
      return Math.max(0, sub.days_remaining_in_subscription);
    }
    if (sub.subscription_end_date) {
      const end = new Date(sub.subscription_end_date);
      const now = new Date();
      const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return Math.max(0, diff);
    }
    return 0;
  };

  // Show renew button for any active or trial subscription
  const showRenewButton = subscription && (subscription.is_subscription_active || subscription.is_trial_active);

  // Handler for renew button with toast confirmation and warning if more than 1 day left
  const handleRenewClick = () => {
    const daysLeft = subscription?.is_subscription_active
      ? getSubscriptionDaysRemaining(subscription)
      : subscription?.is_trial_active
        ? subscription.days_remaining_in_trial
        : 0;
    if (daysLeft > 1) {
      toast({
        title: "Renewal Not Yet Available",
        description: `You can only renew your subscription when there is 1 day or less remaining. You currently have ${daysLeft} days left.`,
        // No variant, no background, just plain toast
        duration: 6000
      });
      return;
    }
    toast({
      title: "Renew Subscription",
      description: "You are about to renew your subscription. After payment and verification, your expiry date will be extended by 31 days.",
      action: (
        <Button
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded ml-4"
          onClick={() => router.push('/admin/subscribe')}
        >
          Proceed
        </Button>
      ),
      duration: 6000
    });
  };

  // Refund request handlers
  const openRefundDialog = (billingId: string) => {
    setSelectedBillingId(billingId);
    setRefundReason("");
    setShowRefundDialog(true);
  };
  const closeRefundDialog = () => {
    setShowRefundDialog(false);
    setRefundReason("");
    setSelectedBillingId(null);
  };
  const submitRefundRequest = async () => {
    if (!refundReason.trim() || !selectedBillingId) return;
    setIsSubmittingRefund(true);
    try {
      const res = await fetchWithAuth(`${getApiUrl()}/api/billing/refund-request/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billing_record: selectedBillingId, reason: refundReason })
      });
      if (res.ok) {
        toast({ title: "Refund request submitted!", description: "Your request will be reviewed." });
        fetchRefundRequests();
        closeRefundDialog();
      } else {
        const data = await res.json();
        toast({ title: "Refund request failed", description: data?.detail || "Please try again.", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Refund request failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsSubmittingRefund(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Loading billing information...</span>
        </div>
      </div>
    )
  }

  if (!subscription) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Billing & Subscription</h1>
            <p className="text-gray-600 mt-2">Manage your subscription and view payment history</p>
          </div>
          <Button onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CreditCard className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Subscription Found</h3>
            <p className="text-gray-500 text-center mb-4">
              You don't have an active subscription. Please contact support or check your account status.
            </p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Main render (no extra curly braces or characters above)
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Billing & Subscription</h1>
          <p className="text-gray-600 mt-2">Manage your subscription and view payment history</p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      {/* RENEW BUTTON */}
      {showRenewButton && (
        <div className="flex justify-end">
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded shadow-lg text-lg"
            onClick={handleRenewClick}
          >
            Renew Subscription
          </Button>
        </div>
      )}
      {/* Subscription Overview */}
      {subscription && (
        <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <CreditCard className="h-5 w-5 text-green-600 dark:text-green-400" />
              Subscription Overview
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300">
              Current subscription status and billing information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</p>
                <div className="flex items-center gap-2">
                  {getStatusBadge(subscription.status)}
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Monthly Fee</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {formatCurrency(subscription.monthly_fee, subscription.currency)}
                </p>
              </div>
              
              {subscription.is_trial_active ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Trial Days Remaining</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {subscription.days_remaining_in_trial}
                  </p>
                </div>
              ) : subscription.is_subscription_active ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Subscription Days Remaining</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {getSubscriptionDaysRemaining(subscription)}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Trial Days Remaining</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">0</p>
                </div>
              )}
              
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Next Payment</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {subscription.next_payment_date ? formatDate(subscription.next_payment_date) : "N/A"}
                </p>
              </div>
            </div>

            <Separator className="bg-gray-200 dark:bg-gray-700" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Trial Period */}
              <div className={`space-y-3 ${!subscription.is_trial_active ? 'opacity-50' : ''} bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4`}> 
                <h3 className="font-semibold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  Trial Period
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Start Date:</span>
                    <span className="text-gray-900 dark:text-gray-100">{formatDate(subscription.trial_start_date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">End Date:</span>
                    <span className="text-gray-900 dark:text-gray-100">{formatDate(subscription.trial_end_date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Active:</span>
                    <span className="text-gray-900 dark:text-gray-100">{subscription.is_trial_active ? "Yes" : "No"}</span>
                  </div>
                </div>
              </div>

              {/* Subscription Period */}
              <div className={`space-y-3 ${subscription.is_subscription_active ? 'ring-2 ring-green-400 bg-green-50 dark:bg-green-900' : 'bg-gray-50 dark:bg-gray-800'} border border-gray-200 dark:border-gray-700 rounded-lg p-4`}>
                <h3 className="font-semibold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                  Subscription Period
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Start Date:</span>
                    <span className="text-gray-900 dark:text-gray-100">{formatDate(subscription.subscription_start_date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">End Date:</span>
                    <span className="text-gray-900 dark:text-gray-100">{formatDate(subscription.subscription_end_date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Active:</span>
                    <span className="text-gray-900 dark:text-gray-100">{subscription.is_subscription_active ? "Yes" : "No"}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs for Payment and Billing History */}
      <Tabs defaultValue="payments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
          <TabsTrigger value="billing">Billing History</TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Payment History
              </CardTitle>
              <CardDescription>
                All payment attempts and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {paymentHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No payment history found</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {paymentHistory.map((payment) => (
                    <div key={payment.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getPaymentStatusBadge(payment.is_successful)}
                          <span className="font-medium">{payment.payment_type}</span>
                        </div>
                        <span className="font-semibold">
                          {formatCurrency(payment.amount, payment.currency)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Created:</span>
                          <p>{formatDate(payment.created_at)}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Processed:</span>
                          <p>{payment.is_successful ? "Active" : (payment.processed_at ? formatDate(payment.processed_at) : "Pending")}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Response:</span>
                          <p>{payment.esewa_response_message || "N/A"}</p>
                        </div>
                      </div>
                      
                      {payment.error_message && (
                        <div className="bg-red-50 border border-red-200 rounded p-3">
                          <p className="text-red-800 text-sm">
                            <AlertCircle className="h-4 w-4 inline mr-1" />
                            Error: {payment.error_message}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Billing History
              </CardTitle>
              <CardDescription>
                Detailed billing records and periods
              </CardDescription>
            </CardHeader>
            <CardContent>
              {billingHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No billing history found</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {billingHistory.map((billing) => (
                    <div key={billing.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge className={billing.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                            {billing.status}
                          </Badge>
                          <span className="font-medium">{billing.payment_method}</span>
                        </div>
                        <span className="font-semibold">
                          {formatCurrency(billing.amount, billing.currency)}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Billing Period:</span>
                          <p>{formatDate(billing.billing_period_start)} - {formatDate(billing.billing_period_end)}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Paid At:</span>
                          <p>{billing.paid_at ? formatDate(billing.paid_at) : "Not paid"}</p>
                        </div>
                      </div>
                      {billing.esewa_transaction_id && (
                        <div className="text-sm text-gray-600">
                          <span>eSewa Transaction ID: {billing.esewa_transaction_id}</span>
                        </div>
                      )}
                      {/* Refund Request Button for completed payments */}
                      {billing.status === 'completed' &&
                        !refundRequests.some(r => r.billing_record_id === billing.id) && (
                        <Button size="sm" variant="outline" onClick={() => openRefundDialog(billing.id)} className="dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800">
                          Request Refund
                        </Button>
                      )}
                      {/* Show refund status for this billing record if exists */}
                      {refundRequests.filter(r => r.billing_record_id === billing.id).map((r) => {
                        let statusClasses = '';
                        if (r.status === 'pending') {
                          statusClasses = 'bg-yellow-100 text-yellow-900 border-yellow-400 dark:bg-gray-800 dark:text-yellow-200 dark:border-yellow-400';
                        } else if (r.status === 'approved') {
                          statusClasses = 'bg-green-100 text-green-900 border-green-400 dark:bg-gray-800 dark:text-green-200 dark:border-green-400';
                        } else if (r.status === 'rejected') {
                          statusClasses = 'bg-red-100 text-red-900 border-red-400 dark:bg-gray-800 dark:text-red-200 dark:border-red-400';
                        } else {
                          statusClasses = 'bg-indigo-100 text-indigo-900 border-indigo-400 dark:bg-gray-800 dark:text-indigo-200 dark:border-indigo-400';
                        }
                        return (
                          <div key={r.id} className={`mt-2 p-2 rounded border text-xs ${statusClasses}`}>
                            <b>Refund Status:</b> {r.status} <br/>
                            <b>Reason:</b> {r.reason} <br/>
                            <b>Requested:</b> {formatDate(r.request_date)}
                            {r.response_message && (<><br/><b>Response:</b> {r.response_message}</>)}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        {/* End of TabsContent for billing */}
      </Tabs>
      {/* Refund Requests Table for Superadmin */}
      {isSuperAdmin && (
        <Card className="dark:bg-gray-900 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="dark:text-gray-100">All Refund Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {refundRequests.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-300">No refund requests found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs border dark:border-gray-700">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-800">
                      <th className="p-2 border dark:border-gray-700 dark:text-gray-100">Admin</th>
                      <th className="p-2 border dark:border-gray-700 dark:text-gray-100">Billing ID</th>
                      <th className="p-2 border dark:border-gray-700 dark:text-gray-100">Reason</th>
                      <th className="p-2 border dark:border-gray-700 dark:text-gray-100">Status</th>
                      <th className="p-2 border dark:border-gray-700 dark:text-gray-100">Requested</th>
                      <th className="p-2 border dark:border-gray-700 dark:text-gray-100">Processed By</th>
                      <th className="p-2 border dark:border-gray-700 dark:text-gray-100">Processed Date</th>
                      <th className="p-2 border dark:border-gray-700 dark:text-gray-100">Response</th>
                    </tr>
                  </thead>
                  <tbody>
                    {refundRequests.map((r) => (
                      <tr key={r.id} className="dark:bg-gray-900">
                        <td className="border p-1 dark:border-gray-700 dark:text-gray-100">{r.admin_email}</td>
                        <td className="border p-1 dark:border-gray-700 dark:text-gray-100">{r.billing_record_id}</td>
                        <td className="border p-1 dark:border-gray-700 dark:text-gray-100">{r.reason}</td>
                        <td className="border p-1 dark:border-gray-700 dark:text-gray-100">{r.status}</td>
                        <td className="border p-1 dark:border-gray-700 dark:text-gray-100">{formatDate(r.request_date)}</td>
                        <td className="border p-1 dark:border-gray-700 dark:text-gray-100">{r.processed_by_email || '-'}</td>
                        <td className="border p-1 dark:border-gray-700 dark:text-gray-100">{r.processed_date ? formatDate(r.processed_date) : '-'}</td>
                        <td className="border p-1 dark:border-gray-700 dark:text-gray-100">{r.response_message || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      {/* Refund Request Modal */}
      <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <DialogContent className="dark:bg-gray-900 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="dark:text-gray-100">Request a Refund</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="block text-sm font-medium dark:text-gray-200">Reason for refund</label>
            <Textarea value={refundReason} onChange={e => setRefundReason(e.target.value)} rows={4} placeholder="Please describe the reason for your refund request..." className="dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeRefundDialog} className="dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800">Cancel</Button>
            <Button onClick={submitRefundRequest} disabled={isSubmittingRefund || !refundReason.trim()} className="dark:bg-blue-700 dark:text-white dark:hover:bg-blue-800">
              {isSubmittingRefund ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 