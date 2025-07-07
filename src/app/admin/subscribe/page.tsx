"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, CreditCard, Shield, Zap } from "lucide-react"
import { toast } from "react-hot-toast"

export default function SubscribePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleSubscribe = async () => {
    setLoading(true)
    
    try {
      // Get user token
      const token = localStorage.getItem('token')
      if (!token) {
        toast.error("Please login first")
        router.push('/admin/login')
        return
      }

      // Call backend to create subscription
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/subscriptions/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          plan_type: 'MONTHLY',
          amount: 999
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Redirect to eSewa payment
        if (data.payment_url) {
          window.location.href = data.payment_url
        } else {
          toast.error("Payment initialization failed")
        }
      } else {
        const error = await response.json()
        toast.error(error.error || "Subscription failed")
      }
    } catch (error) {
      console.error('Subscription error:', error)
      toast.error("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-orange-100 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
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
                
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-3" 
                  onClick={handleSubscribe}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5 mr-2" />
                      Subscribe with eSewa
                    </>
                  )}
                </Button>
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