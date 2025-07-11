"use client"

import { PricingCard } from "./PricingCard"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useEffect, useState } from "react"

export function PricingSection() {
  const router = useRouter()
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(true)

  // Helper to get the correct token
  function getToken() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('adminAccessToken') || localStorage.getItem('employeeAccessToken');
  }

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
          if (data.has_access) {
            // User already has active subscription - redirect to dashboard
            toast.success("You already have an active subscription!");
            router.push('/admin/dashboard');
            return;
          } else {
            // Check if payment is pending
            if (data.subscription_status === 'pending_payment') {
              toast.info(data.message || "Payment is being processed. Please wait for confirmation.");
              return;
            }
          }
        }
      } catch (error) {
        console.error('Error checking subscription status:', error);
      } finally {
        setIsCheckingSubscription(false);
      }
    };

    checkSubscriptionStatus();
  }, [router]);

  const handleStartTrial = async () => {
    // Check if user is logged in
    const token = localStorage.getItem('adminAccessToken') || localStorage.getItem('employeeAccessToken')
    if (!token) {
      toast.error("Please login first to start your free trial")
      router.push('/admin/login?redirect=' + encodeURIComponent('/admin/subscribe'))
      return
    }

    // Check if user is an employee
    const userData = JSON.parse(localStorage.getItem('adminUserData') || localStorage.getItem('employeeUserData') || '{}');
    if (userData.is_employee) {
      toast.error("Employees cannot activate free trials. Please contact your admin.")
      return
    }
    
    try {
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
            // Redirect to subscription page to show monthly options
            setTimeout(() => router.push('/admin/subscribe'), 2000)
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
    }
  }

  const handleSubscribe = async () => {
    // Check if user is logged in
    const token = localStorage.getItem('adminAccessToken') || localStorage.getItem('employeeAccessToken')
    if (!token) {
      toast.error("Please login first to subscribe")
      router.push('/admin/login?redirect=' + encodeURIComponent('/admin/subscribe'))
      return
    }

    // Check if user is an employee
    const userData = JSON.parse(localStorage.getItem('adminUserData') || localStorage.getItem('employeeUserData') || '{}');
    if (userData.is_employee) {
      toast.error("Employees cannot activate subscriptions. Please contact your admin.")
      return
    }
    
    try {
      // Initiate payment for subscription
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://qrcode-project-3.onrender.com"}/api/billing/payment/initiate/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          payment_type: 'subscription',
          amount: 999,
          currency: 'NPR',
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        console.log('Payment response:', data);
        
        // Check if we have the required data for eSewa payment
        if (data.esewa_url) {
          // Create form and submit to eSewa
          const form = document.createElement('form');
          form.method = 'POST';
          form.action = data.esewa_url;

          // Handle both payment_data object and direct payment fields
          const paymentFields = data.payment_data || data;
          
          Object.entries(paymentFields).forEach(([key, value]) => {
            // Skip non-payment fields
            if (['message', 'payment_id', 'reference_id', 'esewa_url', 'transaction_id'].includes(key)) {
              return;
            }
            
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = value as string;
            form.appendChild(input);
          });

          console.log('Submitting form to eSewa:', data.esewa_url);
          document.body.appendChild(form);
          form.submit();
          document.body.removeChild(form);
        } else {
          console.error('Missing eSewa URL in response:', data);
          toast.error("Payment initialization failed - missing payment URL")
        }
      } else {
        // Handle specific error cases
        switch (data.error) {
          case 'subscription_already_active':
            toast.error(data.message || "You already have an active subscription")
            setTimeout(() => router.push('/admin/dashboard'), 2000)
            break
          case 'trial_still_active':
            toast.error(data.message || "Your free trial is still active")
            break
          case 'no_subscription':
            toast.error(data.message || "Please activate free trial first")
            break
          case 'esewa_not_configured':
          case 'esewa_not_enabled':
            toast.error(data.message || "Payment system not configured")
            break
          default:
            toast.error(data.message || data.error || "Subscription failed")
        }
      }
    } catch (error) {
      console.error('Subscription error:', error)
      toast.error("Something went wrong. Please try again.")
    }
  }

  // Show loading while checking subscription status
  if (isCheckingSubscription) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4"></div>
            <p className="text-lg font-semibold text-gray-900">Checking subscription status...</p>
          </div>
        </div>
      </section>
    );
  }

  const freeTrialFeatures = [
    "Access to all admin features",
    "Menu management system",
    "Order management",
    "QR code generation",
    "Customer reviews",
    "Basic analytics",
    "3-day full access"
  ]

  const monthlyFeatures = [
    "Everything in Free Trial",
    "Unlimited orders",
    "Advanced analytics",
    "Priority support",
    "Custom branding",
    "Multiple locations",
    "Email notifications",
    "24/7 system access"
  ]

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Start with a free trial and upgrade when you're ready. 
            No hidden fees, cancel anytime.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="flex flex-col lg:flex-row gap-8 justify-center items-center mb-16">
          {/* Free Trial Card */}
          <PricingCard
            title="Free Trial"
            price="Free"
            description="Try all features for 3 days. No credit card required."
            features={freeTrialFeatures}
            buttonText="Start Free Trial"
            buttonVariant="outline"
            onButtonClick={handleStartTrial}
          />

          {/* Monthly Plan Card */}
          <PricingCard
            title="Monthly Plan"
            price="Rs. 999"
            description="Full access to all features with monthly billing."
            features={monthlyFeatures}
            buttonText="Subscribe Now"
            popular={true}
            onButtonClick={handleSubscribe}
          />
        </div>

        {/* Feature Comparison Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b">
            <h3 className="text-xl font-semibold text-gray-900">
              Feature Comparison
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Feature
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Free Trial
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monthly Plan
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Duration
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    3 Days
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    Monthly
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Menu Management
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-green-500">✓</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-green-500">✓</span>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Order Management
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-green-500">✓</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-green-500">✓</span>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    QR Code Generation
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-green-500">✓</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-green-500">✓</span>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Customer Reviews
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-green-500">✓</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-green-500">✓</span>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Analytics
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-gray-400">Basic</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-green-500">Advanced</span>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Support
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-gray-400">Email</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-green-500">Priority</span>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Payment Method
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-green-500">None Required</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-green-500">eSewa</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16">
          <h3 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h3>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div>
              <h4 className="font-semibold mb-2">Can I cancel anytime?</h4>
              <p className="text-gray-600">Yes, you can cancel your subscription at any time. No long-term commitments required.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">What happens after the free trial?</h4>
              <p className="text-gray-600">After 3 days, you'll need to subscribe to continue using all features. We'll send you a reminder email.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Is there a setup fee?</h4>
              <p className="text-gray-600">No setup fees. You only pay the monthly subscription fee of Rs. 999.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Do you offer refunds?</h4>
              <p className="text-gray-600">We offer a 7-day money-back guarantee if you're not satisfied with our service.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
} 