"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, CreditCard, Shield, Zap } from "lucide-react"
import { toast } from "sonner"
import Image from 'next/image';

export default function SubscribePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [trialLoading, setTrialLoading] = useState(false)
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(true)
  const [hasUsedFreeTrial, setHasUsedFreeTrial] = useState(false);

  // Manual payment state
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualForm, setManualForm] = useState({
    transactionId: '',
    payerName: '',
    paymentDate: '',
    screenshot: null as File | null,
  });
  const [manualSubmitting, setManualSubmitting] = useState(false);

  // Helper to get the correct token
  function getToken() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('adminAccessToken') || localStorage.getItem('employeeAccessToken');
  }

  // Redirect to login if not authenticated
  useEffect(() => {
    const token = getToken();
    if (!token) {
      // Remove any manual payment pending flag to prevent unwanted redirects
      if (typeof window !== 'undefined') {
        localStorage.removeItem('manualPaymentPending');
        localStorage.removeItem('lastManualTransactionId');
      }
      toast.error("Please login first to subscribe.");
      router.push('/admin/login?redirect=' + encodeURIComponent('/admin/subscribe'));
      return;
    }
  }, [router]);

  // Handle payment result redirects
  useEffect(() => {
    const payment = searchParams?.get('payment')
    const error = searchParams?.get('error')
    
    if (payment === 'success') {
      toast.success("Payment successful! Your subscription is now active.")
      setTimeout(() => router.push('/admin/dashboard'), 2000)
      return
    }
    
    if (payment === 'failed') {
      switch (error) {
        case 'verification_failed':
          toast.error("Payment verification failed. Please try again.")
          break
        case 'verification_error':
          toast.error("Payment verification error. Please contact support.")
          break
        case 'payment_cancelled':
          toast.error("Payment was cancelled. You can try again anytime.")
          break
        case 'record_not_found':
          toast.error("Payment record not found. Please contact support.")
          break
        default:
          toast.error("Payment failed. Please try again.")
      }
      return
    }
  }, [searchParams, router])

  // Check if user already has active subscription
  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      const token = getToken();
      if (!token) {
        setIsCheckingSubscription(false);
        return;
      }

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://qrcode-project-3.onrender.com"}/api/billing/subscription/access/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          // If the user is admin, check if they have already used the free trial
          if (data.user_type === 'admin') {
            if (data.subscription_status === 'trial' || data.subscription_status === 'no_subscription') {
              setHasUsedFreeTrial(false);
            } else {
              setHasUsedFreeTrial(true);
            }
          }
          if (data.has_access) {
            // Only redirect if user is an employee
            if (data.user_type === 'employee') {
              toast.success(`Access granted through your admin's subscription!`);
              router.push('/admin/dashboard');
              return;
            }
            // For admins, if they have an active subscription or trial, redirect to dashboard
            if (data.subscription_status === 'active' || data.subscription_status === 'trial') {
              toast.success('You already have an active subscription.');
              router.push('/admin/dashboard');
              return;
            }
            // For admins, allow access to subscribe page for renewal
            // Do not redirect
          } else {
            if (data.user_type === 'employee') {
              toast.error(data.message || "Your admin's subscription has expired.");
              setTimeout(() => router.push('/admin/login'), 2000);
              return;
            }
            if (data.subscription_status === 'pending_payment') {
              toast.info(data.message || "Payment is being processed. Please wait for confirmation.");
              return;
            }
          }
        } else {
          const errorData = await response.json();
          if (errorData.user_type === 'employee') {
            toast.error(errorData.message || "Your admin's subscription has expired.");
            setTimeout(() => router.push('/admin/login'), 2000);
            return;
          }
        }
      } catch (error) {
        console.error('Error checking subscription status:', error);
        const userData = JSON.parse(localStorage.getItem('adminUserData') || localStorage.getItem('employeeUserData') || '{}');
        if (userData.is_employee) {
          toast.error("Unable to verify access. Please contact your admin.");
          setTimeout(() => router.push('/admin/login'), 2000);
          return;
        }
      } finally {
        setIsCheckingSubscription(false);
      }
    };

    checkSubscriptionStatus();
  }, [router]);

  // Helper to create subscription if needed
  const createSubscriptionIfNeeded = async () => {
    const token = getToken();
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/billing/subscription/create/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      // If subscription already exists, ignore error
      if (data?.error === 'subscription_already_active' || data?.error === 'trial_already_active') {
        return;
      }
      throw new Error(data?.message || 'Failed to create subscription');
    }
  };

  // Remove handleSubscribe and all references to automated eSewa payment

  const handleFreeTrial = async () => {
    setTrialLoading(true)
    try {
      const token = getToken();
      if (!token) {
        toast.error("Please login first")
        router.push('/admin/login?redirect=' + encodeURIComponent('/admin/subscribe'))
        return
      }

      // Check if user is an employee
      const userData = JSON.parse(localStorage.getItem('adminUserData') || localStorage.getItem('employeeUserData') || '{}');
      if (userData.is_employee) {
        toast.error("Employees cannot activate free trials. Please contact your admin.")
        return
      }

      // Create subscription (free trial)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://qrcode-project-3.onrender.com"}/api/billing/subscription/create/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast.success(data.message || "Free trial activated! Redirecting to dashboard...")
        setTimeout(() => router.push('/admin/dashboard'), 1500)
      } else {
        // Handle specific error cases
        switch (data.error) {
          case 'subscription_already_active':
            toast.error(data.message || "You already have an active subscription")
            setTimeout(() => router.push('/admin/dashboard'), 2000)
            break
          case 'trial_already_active':
            toast.error(data.message || "You already have an active free trial")
            break
          case 'trial_expired':
            toast.error(data.message || "Free trial period completed")
            // Stay on subscription page to show monthly options
            break
          case 'subscription_expired':
            toast.error(data.message || "Your subscription has expired")
            break
          default:
            toast.error(data.message || data.error || "Could not start free trial")
        }
      }
    } catch (error) {
      console.error('Free trial error:', error)
      toast.error("Something went wrong. Please try again.")
    } finally {
      setTrialLoading(false)
    }
  }

  // Manual payment form submit handler
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualSubmitting(true);
    try {
      // Try to create subscription first
      await createSubscriptionIfNeeded();
      const token = getToken();
      if (!token) {
        toast.error("Please login first");
        router.push('/admin/login?redirect=' + encodeURIComponent('/admin/subscribe'));
        return;
      }
      const formData = new FormData();
      formData.append('transaction_id', manualForm.transactionId);
      formData.append('payer_name', manualForm.payerName);
      formData.append('payment_date', manualForm.paymentDate);
      if (manualForm.screenshot) {
        formData.append('screenshot', manualForm.screenshot);
      }
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/billing/manual-payment/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      if (response.ok) {
        toast.success("Payment submitted! We will verify and activate your subscription soon.");
        localStorage.setItem('lastManualTransactionId', manualForm.transactionId);
        localStorage.setItem('manualPaymentPending', 'true');
        setShowManualForm(false);
        setManualForm({ transactionId: '', payerName: '', paymentDate: '', screenshot: null });
        router.push('/admin/login?payment_pending=1');
      } else {
        const data = await response.json().catch(() => ({}));
        let errorMsg = "Failed to submit payment. Please try again or contact support.";
        if (data) {
          errorMsg = Object.values(data).flat().join(" ");
        }
        toast.error(errorMsg);
      }
    } catch (err: any) {
      toast.error(err?.message || "Error submitting payment. Please try again.");
    } finally {
      setManualSubmitting(false);
    }
  };

  const features = [
    "Unlimited menu items and categories",
    "Real-time order management",
    "QR code generation for tables",
    "Customer reviews and feedback",
    "Advanced analytics and reports",
    "Priority customer support",
    "Email notifications",
    "24/7 system access",
    "No setup fees",
    "Cancel anytime"
  ]

  // Show loading while checking subscription status
  if (isCheckingSubscription) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-lg font-semibold text-orange-900">Checking subscription status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-orange-100 dark:from-gray-900 dark:to-gray-950 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Manual eSewa QR Payment Section - always visible at the top */}
          <div className="mb-8 p-4 border rounded bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 shadow-lg">
            <h3 className="font-bold mb-4 text-2xl text-center text-green-800 dark:text-green-300 flex items-center justify-center gap-2">
              <CreditCard className="w-6 h-6 text-green-500" />
              Pay with eSewa QR Code <span className="text-xs bg-green-600 text-white px-2 py-1 rounded ml-2">Manual Verification</span>
            </h3>
            <div className="flex flex-col items-center mb-4">
              <Image src="/qr/esewa-personal.png" alt="eSewa QR Code" width={200} height={200} className="rounded-lg shadow-md border-2 border-green-200" />
            </div>
            <ol className="list-decimal pl-5 mb-4 text-base text-gray-800 dark:text-gray-200 space-y-1">
              <li>Scan the QR code above with your eSewa app.</li>
              <li>Pay <b className="text-green-700 dark:text-green-400">NPR 999</b> to <b>[Your Name/Account]</b>.</li>
              <li>After payment, click <b className="text-orange-600 dark:text-orange-400">"I have paid"</b> and enter your transaction details.</li>
            </ol>
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-4 italic text-center">Manual verification required: Your access will be granted after we confirm your payment. This may take some time.</div>
            <Button variant="default" onClick={() => setShowManualForm(v => !v)} disabled={showManualForm} className="mb-4 w-full max-w-xs mx-auto bg-green-600 hover:bg-green-700 text-white font-semibold text-lg py-2 rounded shadow">
              <Check className="mr-2 w-5 h-5" />I have paid
            </Button>
            {showManualForm && (
              <form onSubmit={handleManualSubmit} className="space-y-4 mt-2 bg-white dark:bg-gray-900 p-6 rounded-lg shadow-md border border-green-200 dark:border-gray-700 max-w-lg mx-auto">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-1"><CreditCard className="w-4 h-4 text-green-500" />eSewa Transaction ID <span className="text-red-500">*</span></label>
                  <input type="text" required className="w-full px-3 py-2 rounded bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 focus:border-green-400 focus:outline-none" value={manualForm.transactionId} onChange={e => setManualForm(f => ({ ...f, transactionId: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-1"><Shield className="w-4 h-4 text-blue-500" />Payer Name/Number (optional)</label>
                  <input type="text" className="w-full px-3 py-2 rounded bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 focus:border-blue-400 focus:outline-none" value={manualForm.payerName} onChange={e => setManualForm(f => ({ ...f, payerName: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-1"><Zap className="w-4 h-4 text-orange-500" />Payment Date/Time (optional)</label>
                  <input type="datetime-local" className="w-full px-3 py-2 rounded bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 focus:border-orange-400 focus:outline-none" value={manualForm.paymentDate} onChange={e => setManualForm(f => ({ ...f, paymentDate: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-1"><CreditCard className="w-4 h-4 text-purple-500" />Upload Screenshot (optional)</label>
                  <input type="file" accept="image/*" className="w-full text-gray-700 dark:text-gray-200" onChange={e => setManualForm(f => ({ ...f, screenshot: e.target.files?.[0] || null }))} />
                </div>
                <Button type="submit" disabled={manualSubmitting} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded transition flex items-center justify-center">
                  {manualSubmitting ? <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></span> : <Check className="mr-2 w-5 h-5" />}Submit Payment
                </Button>
              </form>
            )}
          </div>

          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-orange-900 mb-4">
              Subscribe to QR Menu System
            </h1>
            <p className="text-xl text-gray-600">
              Get full access to all features and start managing your restaurant efficiently
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Pricing Card */}
            <Card className="relative border-2 border-blue-500 shadow-lg">
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white">
                <Zap className="w-3 h-3 mr-1" />
                Most Popular
              </Badge>
              
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-3xl font-bold">Monthly Plan</CardTitle>
                <div className="mt-4">
                  <span className="text-5xl font-bold text-blue-600">Rs. 999</span>
                  <span className="text-gray-500 ml-2">/month</span>
                </div>
                <CardDescription className="text-lg mt-2">
                  Full access to all features with monthly billing
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {features.map((feature, index) => (
                    <li key={index} className="flex items-center text-sm">
                      <Check className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                {/* Only show the free trial button if hasUsedFreeTrial is false */}
                {!hasUsedFreeTrial && (
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-3" 
                    onClick={handleFreeTrial}
                    disabled={trialLoading}
                  >
                    {trialLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600 mr-2"></div>
                        Activating...
                      </>
                    ) : (
                      <>Start Free Trial</>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Benefits and Info */}
            <div className="space-y-6">
              {/* Why Subscribe */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-green-500" />
                    Why Subscribe?
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Professional Restaurant Management</h4>
                    <p className="text-gray-600 text-sm">
                      Streamline your restaurant operations with our comprehensive management system.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">No Hidden Fees</h4>
                    <p className="text-gray-600 text-sm">
                      Transparent pricing with no setup fees or hidden charges.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Cancel Anytime</h4>
                    <p className="text-gray-600 text-sm">
                      No long-term commitments. Cancel your subscription at any time.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <CreditCard className="w-6 h-6 text-blue-500" />
                    <div>
                      <p className="font-semibold">Secure Payment</p>
                      <p className="text-sm text-gray-600">Pay securely with eSewa</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Shield className="w-6 h-6 text-green-500" />
                    <div>
                      <p className="font-semibold">7-Day Money Back</p>
                      <p className="text-sm text-gray-600">Not satisfied? Get a full refund</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* FAQ */}
              <Card>
                <CardHeader>
                  <CardTitle>Frequently Asked Questions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm">When will I be charged?</h4>
                    <p className="text-sm text-gray-600">You'll be charged Rs. 999 immediately upon subscription.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Can I cancel anytime?</h4>
                    <p className="text-sm text-gray-600">Yes, you can cancel your subscription at any time from your dashboard.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">What payment methods do you accept?</h4>
                    <p className="text-sm text-gray-600">We currently accept payments through eSewa.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Back to Dashboard */}
          <div className="text-center mt-12">
            <Button 
              variant="outline" 
              onClick={() => router.push('/admin/dashboard')}
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 