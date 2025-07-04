"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UtensilsCrossed, CreditCard, Wallet, ArrowLeft, Check } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useRouter } from "next/navigation"
import { getApiUrl } from '@/lib/api-service';

export default function CheckoutContent() {
  const [paymentMethod, setPaymentMethod] = useState("card")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [cartItems, setCartItems] = useState([])
  const [orderId, setOrderId] = useState(null)
  const [mounted, setMounted] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    
    // Only access localStorage after component is mounted on client
    if (typeof window !== 'undefined') {
      const storedCart = localStorage.getItem('cart')
      const storedOrderId = localStorage.getItem('orderId')
      if (storedCart) {
        setCartItems(JSON.parse(storedCart))
      }
      if (storedOrderId) {
        setOrderId(storedOrderId as any)
      }
    }
  }, [])

  // Define a type for cart items to fix type errors
  type CartItem = {
    price: number
    quantity: number
    [key: string]: any
  }

  // Explicitly type cartItems as CartItem[]
  const typedCartItems: CartItem[] = cartItems as CartItem[]

  const subtotal = typedCartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const serviceFee = subtotal * 0.05
  const total = subtotal + serviceFee

  // Mock rewards data
  const availableRewards = [
    {
      id: "reward1",
      name: "10% Off Your Bill",
      discount: total * 0.1,
      pointsCost: 750,
    },
    {
      id: "reward2",
      name: "Free Dessert",
      discount: 8.99,
      pointsCost: 500,
    },
  ]

  const handleEsewaPayment = async () => {
    setIsProcessing(true)
    try {
      if (!orderId) {
        throw new Error("Order ID not found.")
      }
      const response = await fetch(getApiUrl() + '/api/payments/esewa/initiate/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: orderId,
          amount: subtotal.toFixed(2),
          tax_amount: (0).toFixed(2),
          product_service_charge: serviceFee.toFixed(2),
          product_delivery_charge: (0).toFixed(2),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to initiate eSewa payment.')
      }

      const data = await response.json()
      // eSewa's payment_url is where we need to redirect the user
      if (data.payment_url) {
        router.push(data.payment_url)
      } else {
        throw new Error("Payment URL not received from eSewa.")
      }
    } catch (error) {
      console.error("eSewa Payment Error:", error)
      setIsProcessing(false)
      // Handle error display to the user
    }
  }

  const handlePayment = () => {
    if (paymentMethod === "esewa") {
      handleEsewaPayment()
      return
    }

    setIsProcessing(true)
    // Simulate payment processing for other methods
    setTimeout(() => {
      setIsProcessing(false)
      setIsComplete(true)
    }, 2000)
  }

  if (isComplete) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white border-b">
          <div className="container mx-auto p-4 flex justify-between items-center">
            <Link href="/menu" className="flex items-center gap-2">
              <UtensilsCrossed className="h-6 w-6 text-orange-600" />
              <h1 className="text-xl font-bold text-orange-800">QR Menu</h1>
            </Link>
           
          </div>
        </header>

        <main className="flex-1 container mx-auto px-4 py-12 flex items-center justify-center">
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <div className="mx-auto bg-green-100 rounded-full p-3 mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl">Payment Successful!</CardTitle>
              <CardDescription>Your order has been placed successfully</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Order Number</p>
                  <p className="font-semibold">ORD-1256</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Amount</p>
                  <p className="font-semibold">RS {total.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Payment Method</p>
                  <p className="font-semibold capitalize">{paymentMethod}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Estimated Time</p>
                  <p className="font-semibold">25-35 minutes</p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button asChild className="w-full bg-orange-600 hover:bg-orange-700">
                <Link href="/menu">Order More</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/profile">View Order History</Link>
              </Button>
            </CardFooter>
          </Card>
        </main>

        <footer className="bg-orange-800 text-white py-4">
          <div className="container mx-auto px-4 text-center text-orange-200">
            <p> a9 2023 QR Menu System. All rights reserved.</p>
          </div>
        </footer>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b">
        <div className="container mx-auto p-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <UtensilsCrossed className="h-6 w-6 text-orange-600" />
            <h1 className="text-xl font-bold text-orange-800">QR Menu</h1>
          </Link>
         
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-4">Checkout</h2>
          <Tabs defaultValue="payment" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="payment">Payment</TabsTrigger>
              <TabsTrigger value="review">Review</TabsTrigger>
            </TabsList>
            <TabsContent value="payment">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Method</CardTitle>
                    <CardDescription>Select your preferred payment method.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="card" id="card" />
                        <Label htmlFor="card">Card Payment</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="esewa" id="esewa" />
                        <Label htmlFor="esewa">eSewa</Label>
                      </div>
                    </RadioGroup>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Order Summary</CardTitle>
                    <CardDescription>Review your order before payment.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {typedCartItems.map((item, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <span>{item.name} x {item.quantity}</span>
                          <span>RS {item.price * item.quantity}</span>
                        </div>
                      ))}
                      <Separator />
                      <div className="flex justify-between text-lg font-semibold">
                        <span>Subtotal</span>
                        <span>RS {subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-semibold">
                        <span>Service Fee</span>
                        <span>RS {serviceFee.toFixed(2)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-2xl font-bold">
                        <span>Total</span>
                        <span>RS {total.toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Button onClick={handlePayment} className="w-full bg-orange-600 hover:bg-orange-700" disabled={isProcessing}>
                  {isProcessing ? "Processing..." : "Proceed to Payment"}
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="review">
              <Card>
                <CardHeader>
                  <CardTitle>Review Your Order</CardTitle>
                  <CardDescription>Double-check your order details before finalizing.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {typedCartItems.map((item, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span>{item.name} x {item.quantity}</span>
                        <span>RS {item.price * item.quantity}</span>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Subtotal</span>
                      <span>RS {subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Service Fee</span>
                      <span>RS {serviceFee.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-2xl font-bold">
                      <span>Total</span>
                      <span>RS {total.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
} 