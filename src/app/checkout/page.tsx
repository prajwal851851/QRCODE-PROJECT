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


export default function CheckoutPage() {
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
      const response = await fetch('/api/esewa/initiate/', {
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
            <p>© 2023 QR Menu System. All rights reserved.</p>
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
          <Button variant="ghost" asChild className="pl-0">
            <Link href="/menu">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Menu
            </Link>
          </Button>
        </div>

        <div className="grid md:grid-cols-[1fr_400px] gap-8">
          <div>
            <h1 className="text-2xl font-bold mb-6">Checkout</h1>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
                <CardDescription>Select your preferred payment method</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="payment" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="payment">Payment</TabsTrigger>
                    <TabsTrigger value="rewards">Rewards</TabsTrigger>
                    <TabsTrigger value="split">Split Bill</TabsTrigger>
                  </TabsList>
                  <TabsContent value="payment" className="pt-4">
                    <RadioGroup defaultValue="card" value={paymentMethod} onValueChange={setPaymentMethod}>
                      <div className="flex flex-col space-y-4">
                        <div className="flex items-center space-x-2 rounded-md border p-4">
                          <RadioGroupItem value="cash" id="cash" />
                          <Label htmlFor="cash" className="flex-1 cursor-pointer">
                            <div className="flex items-center gap-3">
                              <Wallet className="h-5 w-5 text-green-600" />
                              <div>Cash on Delivery</div>
                            </div>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2 rounded-md border p-4">
                          <RadioGroupItem value="card" id="card" />
                          <Label htmlFor="card" className="flex-1 cursor-pointer">
                            <div className="flex items-center gap-3">
                              <CreditCard className="h-5 w-5 text-orange-600" />
                              <div>Credit/Debit Card</div>
                            </div>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2 rounded-md border p-4">
                          <RadioGroupItem value="esewa" id="esewa" />
                          <Label htmlFor="esewa" className="flex-1 cursor-pointer">
                            <div className="flex items-center gap-3">
                              <Wallet className="h-5 w-5 text-green-600" />
                              <div>eSewa</div>
                            </div>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2 rounded-md border p-4">
                          <RadioGroupItem value="khalti" id="khalti" />
                          <Label htmlFor="khalti" className="flex-1 cursor-pointer">
                            <div className="flex items-center gap-3">
                              <Wallet className="h-5 w-5 text-purple-600" />
                              <div>Khalti</div>
                            </div>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2 rounded-md border p-4">
                          <RadioGroupItem value="fonepay" id="fonepay" />
                          <Label htmlFor="fonepay" className="flex-1 cursor-pointer">
                            <div className="flex items-center gap-3">
                              <Wallet className="h-5 w-5 text-blue-600" />
                              <div>Fonepay</div>
                            </div>
                          </Label>
                        </div>
                      </div>
                    </RadioGroup>

                    {paymentMethod === "card" && (
                      <div className="mt-6 space-y-4">
                        <div className="grid gap-2">
                          <Label htmlFor="card-name">Name on Card</Label>
                          <Input id="card-name" placeholder="John Doe" />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="card-number">Card Number</Label>
                          <Input id="card-number" placeholder="1234 5678 9012 3456" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="expiry">Expiry Date</Label>
                            <Input id="expiry" placeholder="MM/YY" />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="cvc">CVC</Label>
                            <Input id="cvc" placeholder="123" />
                          </div>
                        </div>
                      </div>
                    )}

                    {(paymentMethod === "esewa" || paymentMethod === "khalti" || paymentMethod === "fonepay") && (
                      <div className="mt-6 space-y-4">
                        <div className="grid gap-2">
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input id="phone" placeholder="98XXXXXXXX" />
                        </div>
                      </div>
                    )}

                    {paymentMethod === "cash" && (
                      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="text-sm text-yellow-800">
                          Please have the exact amount ready for the delivery person. Our staff does not carry change.
                        </p>
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="rewards" className="pt-4">
                    <div className="space-y-4">
                      <p className="text-sm text-gray-500">Available Rewards</p>

                      <RadioGroup defaultValue="none">
                        <div className="flex flex-col space-y-4">
                          <div className="flex items-center space-x-2 rounded-md border p-4">
                            <RadioGroupItem value="none" id="no-reward" />
                            <Label htmlFor="no-reward" className="flex-1 cursor-pointer">
                              Don't use rewards
                            </Label>
                          </div>

                          {availableRewards.map((reward) => (
                            <div key={reward.id} className="flex items-center space-x-2 rounded-md border p-4">
                              <RadioGroupItem value={reward.id} id={reward.id} />
                              <Label htmlFor={reward.id} className="flex-1 cursor-pointer">
                                <div className="flex justify-between">
                                  <div>
                                    <div>{reward.name}</div>
                                    <div className="text-sm text-gray-500">{reward.pointsCost} points</div>
                                  </div>
                                  <div className="text-orange-600 font-medium">-${reward.discount.toFixed(2)}</div>
                                </div>
                              </Label>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    </div>
                  </TabsContent>
                  <TabsContent value="split" className="pt-4">
                    <div className="space-y-4">
                      <p className="text-sm text-gray-500">Split your bill with friends</p>

                      <div className="grid gap-2">
                        <Label htmlFor="split-amount">Your Contribution</Label>
                        <Input id="split-amount" type="number" defaultValue={total.toFixed(2)} />
                        <p className="text-xs text-gray-500">
                          Enter the amount you want to pay. Share the QR code with friends to pay the remaining amount.
                        </p>
                      </div>

                      <Button className="w-full">Generate Split Payment QR</Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(cartItems as Array<{ id: string | number; quantity: number; name: string; price: number }>).map((item) => (
                    <div key={item.id} className="flex justify-between">
                      <div>
                        <span className="font-medium">{item.quantity}x </span>
                        <span>{item.name}</span>
                      </div>
                      <div>${(item.price * item.quantity).toFixed(2)}</div>
                    </div>
                  ))}

                  <Separator />

                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span>Service Fee (5%)</span>
                    <span>${serviceFee.toFixed(2)}</span>
                  </div>

                  <Separator />

                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>RS {total.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full bg-orange-600 hover:bg-orange-700"
                  onClick={handlePayment}
                  disabled={isProcessing}
                >
                  {isProcessing ? "Processing..." : "Complete Payment"}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>

      <footer className="bg-orange-800 text-white py-4 mt-12">
        <div className="container mx-auto px-4 text-center text-orange-200">
          <p>© 2023 QR Menu System. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
