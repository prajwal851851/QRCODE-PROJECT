import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card } from "@/components/ui/card"
import { AnimatePresence, motion } from "framer-motion"
import { createOrderWithCheck } from "@/lib/api-service"

type CartItem = {
  id: number
  name: string
  price: number
  quantity: number
}

type CheckoutDialogProps = {
  isOpen: boolean
  onClose: () => void
  cartItems: CartItem[]
  setCartItems: (items: CartItem[]) => void
  tableName: string
  onOrderPlaced: () => void
  diningOption: string
  extraCharges: { label: string; amount: number }[]
}

export function CheckoutDialog({ isOpen, onClose, cartItems, setCartItems, tableName, onOrderPlaced, diningOption: initialDiningOption, extraCharges }: CheckoutDialogProps) {
  const [customerName, setCustomerName] = useState("")
  const [specialInstructions, setSpecialInstructions] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const router = useRouter()
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "esewa">("cash")
  const [diningOption, setDiningOption] = useState(initialDiningOption)
  const [step, setStep] = useState(0)

  // Sync with prop when dialog opens or prop changes
  useEffect(() => {
    if (isOpen) {
      setDiningOption(initialDiningOption);
    }
  }, [isOpen, initialDiningOption]);

  // Shared calculation helpers to avoid mismatch and rounding errors
  const calcSubtotal = (items: CartItem[]) => items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
  const calcExtraChargesTotal = (charges: { label: string; amount: number }[]) => charges.reduce((sum, charge) => sum + Number(charge.amount), 0);
  const calcGrandTotal = (items: CartItem[], charges: { label: string; amount: number }[]) => {
    // Always round to 2 decimals after summing
    return Number((calcSubtotal(items) + calcExtraChargesTotal(charges)).toFixed(2));
  };

  const subtotal = calcSubtotal(cartItems);
  const extraChargesTotal = calcExtraChargesTotal(extraCharges);
  const total = calcGrandTotal(cartItems, extraCharges);

  const handleEsewaPayment = async () => {
    try {
      // Store order details in localStorage for later creation after payment
      const orderDetails = {
        tableName,
          items: cartItems.map(item => ({
            menuItemId: item.id.toString(),
            name: item.name,
          price: Number(item.price),
            quantity: item.quantity
          })),
          customer_name: customerName,
          special_instructions: specialInstructions,
          dining_option: diningOption,
          total: total,
          payment_status: 'pending',
          payment_method: 'esewa',
        extra_charges_applied: extraCharges.map(charge => ({
          label: charge.label,
          amount: Number(charge.amount)
        }))
      };
      localStorage.setItem('pendingEsewaOrder', JSON.stringify(orderDetails));

      // Generate a temporary order ID for eSewa payment that includes tableUid
      const tableUid = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('tableUid') : null;
      const tempOrderId = tableUid ? `temp-${tableUid}` : `temp-${Date.now()}`;

      // Now initiate eSewa payment with the temporary order ID
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch('http://localhost:8000/api/payments/esewa/initiate/', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          amount: total,
          tax_amount: 0,
          product_service_charge: 0,
          product_delivery_charge: 0,
          orderId: tempOrderId,
          tableUid: tableUid // Also pass tableUid separately for backup
        }),
      })
      if (!response.ok) {
        throw new Error('Failed to initiate eSewa payment')
      }
      const paymentData = await response.json()
      // Ensure all numeric fields are strings with no decimals
      const numericFields = [
        'amount',
        'tax_amount',
        'product_service_charge',
        'product_delivery_charge',
        'total_amount',
      ];
      numericFields.forEach((field) => {
        if (paymentData[field] !== undefined) {
          paymentData[field] = String(parseInt(paymentData[field], 10));
        }
      });
      // Log form data for debugging
      console.log('[eSewa FORM SUBMIT]');
      Object.entries(paymentData).forEach(([key, value]) => {
        if (key !== 'payment_url') {
          console.log(key, value);
        }
      });
      // Create form and submit to eSewa
      const form = document.createElement('form')
      form.method = 'POST'
      form.action = paymentData.payment_url
      // Add all payment data as hidden inputs
      Object.entries(paymentData).forEach(([key, value]) => {
        if (key !== 'payment_url') {
          const input = document.createElement('input')
          input.type = 'hidden'
          input.name = key
          input.value = String(value)
          form.appendChild(input)
        }
      })
      document.body.appendChild(form)
      form.submit()
      document.body.removeChild(form)
    } catch (error) {
      console.error('eSewa payment error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to initiate eSewa payment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Form submitted with payment method:', paymentMethod)
    setIsSubmitting(true)
    setError(null)

    try {
      if (paymentMethod === 'esewa') {
        console.log('Initiating eSewa payment for order:', total)
        // Initiate eSewa payment
        await handleEsewaPayment()
      } else {
        // Cash payment: create order immediately and redirect
      let tableId = Number(tableName)
      if (isNaN(tableId)) {
        const res = await fetch(`http://localhost:8000/api/tables/?public_id=${tableName}`)
        if (!res.ok) throw new Error('Failed to fetch table info')
        const tables = await res.json()
        if (!tables.length) throw new Error('Table not found')
        tableId = tables[0].id
      }
      const formattedExtraCharges = extraCharges.map(charge => ({
        label: charge.label,
        amount: Number(charge.amount)
      }))
      
      // Generate a unique transaction_uuid for cash payment
      const transactionUuid = `cash-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      const orderData = {
        table: tableId,
        items: cartItems.map(item => ({
          menuItemId: item.id.toString(),
          name: item.name,
            price: Number(item.price),
          quantity: item.quantity
        })),
        customer_name: customerName,
        special_instructions: specialInstructions,
        dining_option: diningOption,
        total: total,
          payment_status: 'pending',
          payment_method: paymentMethod,
        extra_charges_applied: formattedExtraCharges,
        transaction_uuid: transactionUuid
      }

      const data = await createOrderWithCheck(orderData)
    const orderId = data.id || (data.order && data.order.id)
        // Redirect to order status page with tableUid and transaction_uuid
        const tableUid = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('tableUid') : null;
        let url = `/menu/order-status/${orderId}`;
        if (tableUid) {
          url += `?transaction_uuid=${transactionUuid}&tableUid=${tableUid}`;
        } else {
          url += `?transaction_uuid=${transactionUuid}`;
        }
        onOrderPlaced();
        router.push(url);
  }
    } catch (err) {
      console.error('Error in handleSubmit:', err)
      setError(err instanceof Error ? err.message : 'Failed to place order')
    } finally {
      setIsSubmitting(false)
    }
  };

  // Animation variants
  const fadeSlide = {
    initial: { opacity: 0, x: 40 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -40 },
    transition: { duration: 0.3 }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-full p-0 bg-white dark:bg-[#181e29] rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700">
        <Card className="border-none shadow-none bg-transparent dark:bg-transparent">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="step0" {...fadeSlide} className="p-6">
                <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Your Order</h2>
                <div className="space-y-2 mb-4 max-h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
                  {cartItems.map((item, idx) => (
                    <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <div className="flex-1">
                        <span className="font-medium text-gray-900 dark:text-white">{item.name}</span>
              </div>
                      <div className="flex items-center gap-2">
                        <Button size="icon" variant="ghost" className="rounded-full border border-gray-200 dark:border-gray-700 text-lg px-2 py-1" onClick={() => {
                          if (item.quantity > 1) {
                            const newCart = [...cartItems];
                            newCart[idx].quantity -= 1;
                            setCartItems(newCart);
                          }
                        }}>-</Button>
                        <span className="w-6 text-center text-gray-900 dark:text-white">{item.quantity}</span>
                        <Button size="icon" variant="ghost" className="rounded-full border border-gray-200 dark:border-gray-700 text-lg px-2 py-1" onClick={() => {
                          const newCart = [...cartItems];
                          newCart[idx].quantity += 1;
                          setCartItems(newCart);
                        }}>+</Button>
          </div>
                      <div className="w-24 text-right font-mono text-gray-900 dark:text-white">Rs. {(item.price * item.quantity).toFixed(2)}</div>
          </div>
                  ))}
                </div>
                <div className="space-y-1 mb-2">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>Subtotal</span>
                    <span>Rs. {subtotal.toFixed(2)}</span>
                  </div>
                  {extraCharges.map((charge, i) => (
                    <div key={i} className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                      <span>{charge.label}</span>
                      <span>Rs. {charge.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center py-3 border-t border-gray-200 dark:border-gray-700 mt-4 mb-6">
                  <span className="font-bold text-lg text-gray-900 dark:text-white">Total</span>
                  <span className="font-bold text-lg text-primary dark:text-primary">Rs. {total.toFixed(2)}</span>
                </div>
                <div className="flex flex-col gap-2 mt-6">
                  <Button className="w-full py-3 rounded-full text-lg font-semibold transition-transform hover:scale-105 bg-primary dark:bg-primary text-white dark:text-white" onClick={() => setStep(1)}>
                    Place Order
                  </Button>
                  <Button variant="outline" className="w-full py-3 rounded-full text-lg font-semibold dark:bg-[#232a3a] dark:text-white" onClick={onClose}>
                    Continue Shopping
                  </Button>
                </div>
              </motion.div>
            )}
            {step === 1 && (
              <motion.div key="step1" {...fadeSlide} className="p-6">
                <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Customer Info</h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="customerName" className="text-gray-700 dark:text-gray-300">Your Name (optional)</Label>
                    <Input id="customerName" placeholder="Your name (optional)" value={customerName} onChange={e => setCustomerName(e.target.value)} className="mt-1 bg-white dark:bg-[#232a3a] border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" autoFocus />
                  </div>
                  <div>
                    <Label htmlFor="specialInstructions" className="text-gray-700 dark:text-gray-300">Special Instructions (optional)</Label>
                    <Textarea id="specialInstructions" placeholder="Any notes for the kitchen? (optional)" value={specialInstructions} onChange={e => setSpecialInstructions(e.target.value)} className="mt-1 bg-white dark:bg-[#232a3a] border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" />
                  </div>
                  <div className="flex gap-2 mt-6">
                    <Button variant="outline" className="flex-1 rounded-full dark:bg-[#232a3a] dark:text-white" onClick={() => setStep(0)}>
                      Back
                    </Button>
                    <Button className="flex-1 rounded-full font-semibold transition-transform hover:scale-105 bg-primary dark:bg-primary text-white dark:text-white" onClick={() => setStep(2)}>
                      Next: Payment
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
            {step === 2 && (
              <motion.div key="step2" {...fadeSlide} className="p-6">
                <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Payment Method</h2>
                <RadioGroup value={paymentMethod} onValueChange={v => setPaymentMethod(v as any)} className="mb-6 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="cash" id="cash" className="peer" />
                    <Label htmlFor="cash" className="peer-checked:text-primary cursor-pointer text-gray-900 dark:text-white flex items-center gap-2">
                      <span>Cash</span>
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-white dark:bg-gray-900 rounded shadow border border-gray-200 dark:border-gray-700">
                        <img src="https://static.vecteezy.com/system/resources/previews/016/096/684/non_2x/nepal-currency-symbol-nepalese-rupee-icon-npr-sign-illustration-vector.jpg" alt="Nepalese Rupee" className="w-6 h-6 object-contain" />
                      </span>
                    </Label>
              </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="esewa" id="esewa" className="peer" />
                    <Label htmlFor="esewa" className="peer-checked:text-primary cursor-pointer text-gray-900 dark:text-white flex items-center gap-2">
                      <span>eSewa</span>
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-white dark:bg-gray-900 rounded shadow border border-gray-200 dark:border-gray-700">
                        <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS5NUaV-BsO31dW21_y2-K6jHAxBzXftgi6xA&s" alt="eSewa" className="w-6 h-6 object-contain" />
                      </span>
                    </Label>
            </div>
                </RadioGroup>
                <div className="flex gap-2 mt-6">
                  <Button variant="outline" className="flex-1 rounded-full dark:bg-[#232a3a] dark:text-white" onClick={() => setStep(1)}>
                    Back
          </Button>
                  <Button className="flex-1 rounded-full font-semibold transition-transform hover:scale-105 bg-primary dark:bg-primary text-white dark:text-white" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Placing Order...' : 'Place Order'}
          </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </DialogContent>
    </Dialog>
  )
} 