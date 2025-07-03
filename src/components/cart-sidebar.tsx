"use client"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ShoppingCart, X } from "lucide-react"
import { MenuItem } from "@/lib/types"
import { useEffect, useState } from "react"

interface CartItem {
  id: number
  name: string
  price: number
  quantity: number
}

interface CartSidebarProps {
  isOpen: boolean; // Sidebar open state
  onClose: () => void; // Function to close the sidebar
  cartItems: (MenuItem & { quantity: number })[]; // Array of items with quantity
  updateQuantity: (itemId: number, quantity: number) => void; // Function to update quantity
  removeFromCart: (itemId: number) => void; // Function to remove item from cart
  totalPrice: number; // Total price of items in the cart
  onCheckout: () => void; // Add onCheckout prop
  restaurantUserId?: number; // ID of the restaurant/admin user who owns this menu
  onExtraChargesChange?: (charges: { label: string; amount: number }[]) => void; // Callback for extra charges changes
}

export function CartSidebar({
  isOpen,
  onClose,
  cartItems,
  updateQuantity,
  removeFromCart,
  totalPrice,
  onCheckout, // Accept onCheckout prop
  restaurantUserId, // Accept restaurant ID prop
  onExtraChargesChange, // Accept extra charges change callback
}: CartSidebarProps) {
  // Add state for extra charges
  const [extraCharges, setExtraCharges] = useState<{ label: string; amount: number }[]>([]);

  // Load extra charges from backend API when sidebar opens
  useEffect(() => {
    if (isOpen) {
      // Check if restaurant user ID is available
      if (!restaurantUserId) {
        console.log('No restaurant user ID available - no extra charges will be shown');
        setExtraCharges([]);
        onExtraChargesChange?.([]);
        return;
      }
      
      // Use the correct API endpoint with the restaurant user ID
      // This endpoint has been tested and confirmed to work correctly
      const url = `http://localhost:8000/api/extra-charges/by-user/${restaurantUserId}/`;
      console.log(`Fetching extra charges for restaurant ID ${restaurantUserId} from: ${url}`);
      
      fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      })
        .then(res => {
          console.log(`Extra charges API response status: ${res.status}`);
          if (!res.ok) {
            throw new Error(`API responded with status ${res.status}`);
          }
          return res.json();
        })
        .then(data => {
          console.log('Extra charges data received:', data);
          if (Array.isArray(data) && data.length > 0) {
            // Format the data properly
            const formattedCharges = data.map(charge => ({
              label: charge.label,
              amount: Number(charge.amount)
            }));
            console.log('Using restaurant-specific charges:', formattedCharges);
            setExtraCharges(formattedCharges);
            onExtraChargesChange?.(formattedCharges);
          } else {
            // No charges found for this restaurant
            console.log('No extra charges found for this restaurant');
            setExtraCharges([]);
            onExtraChargesChange?.([]);
          }
        })
        .catch(error => {
          console.error('Error fetching extra charges:', error);
          setExtraCharges([]);
          onExtraChargesChange?.([]);
        });
    }
  }, [isOpen, restaurantUserId, onExtraChargesChange]); // Include onExtraChargesChange in dependencies

  // Calculate total with extra charges
  const totalWithCharges = Number((totalPrice + extraCharges.reduce((sum, c) => sum + Number(c.amount), 0)).toFixed(2))

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md flex flex-col items-center justify-center">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center">
            <ShoppingCart className="mr-2 h-5 w-5" />
            Cart
          </SheetTitle>
        </SheetHeader>
        <Button className="w-full bg-orange-600 hover:bg-orange-700 hover:scale-105 active:scale-95 transition-transform" onClick={onCheckout}>Checkout</Button>
        <Button variant="outline" className="w-full mt-2" onClick={onClose}>
          Continue Shopping
        </Button>
      </SheetContent>
    </Sheet>
  )
}
