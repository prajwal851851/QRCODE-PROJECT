"use client"

import { PricingCard } from "./PricingCard"
import { useRouter } from "next/navigation"
import { toast } from "react-hot-toast"

export function PricingSection() {
  const router = useRouter()

  const handleStartTrial = () => {
    // Check if user is logged in
    const token = localStorage.getItem('token')
    if (!token) {
      toast.error("Please login first to start your free trial")
      router.push('/admin/login')
      return
    }
    
    // Start free trial logic
    toast.success("Starting your 3-day free trial!")
    router.push('/admin/dashboard')
  }

  const handleSubscribe = () => {
    // Check if user is logged in
    const token = localStorage.getItem('token')
    if (!token) {
      toast.error("Please login first to subscribe")
      router.push('/admin/login')
      return
    }
    
    // Redirect to subscription page
    router.push('/admin/subscribe')
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
            onClick={handleStartTrial}
          />

          {/* Monthly Plan Card */}
          <PricingCard
            title="Monthly Plan"
            price="Rs. 999"
            description="Full access to all features with monthly billing."
            features={monthlyFeatures}
            buttonText="Subscribe Now"
            popular={true}
            onClick={handleSubscribe}
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