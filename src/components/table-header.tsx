"use client"

import { Button } from "@/components/ui/button"
import { ShoppingCart, UtensilsCrossed, Home } from "lucide-react"
import Link from "next/link"

interface TableHeaderProps {
  tableNumber: number
  cartItemCount: number
  onCartClick: () => void
}

export function TableHeader({ tableNumber, cartItemCount, onCartClick }: TableHeaderProps) {
  return (
    <header className="sticky top-0 z-10 bg-white border-b shadow-sm">
      <div className="container mx-auto p-4 flex justify-between items-center">
        <Link href="/menu" className="flex items-center gap-2">
          <UtensilsCrossed className="h-6 w-6 text-orange-600" />
          <h1 className="text-xl font-bold text-orange-800">QR Menu</h1>
        </Link>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/">
              <Home className="h-4 w-4 mr-1" />
              <span>Home</span>
            </Link>
          </Button>
          <Button variant="ghost" size="icon" className="relative" onClick={onCartClick}>
            <ShoppingCart className="h-5 w-5" />
            {cartItemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {cartItemCount}
              </span>
            )}
            <span className="sr-only">Cart</span>
          </Button>
        </div>
      </div>
      <div className="bg-orange-100 py-2 px-4 text-center text-orange-800 font-medium">Table {tableNumber}</div>
    </header>
  )
}
