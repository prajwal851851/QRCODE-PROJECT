"use client"

import { Button } from "@/components/ui/button"
import { ShoppingCart, UtensilsCrossed, User, Moon, Sun } from "lucide-react"
import Link from "next/link"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

interface MenuHeaderProps {
  cartItemCount: number
  onCartClick: () => void
  tableId?: string | null
}

export function MenuHeader({ cartItemCount, onCartClick, tableId }: MenuHeaderProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return (
    <header className="z-10 bg-white dark:bg-gray-900 border-b shadow-sm dark:border-gray-800">
      <div className="container mx-auto p-4 flex justify-between items-center">
        <Link href="/menu" className="flex items-center gap-2">
          <UtensilsCrossed className="h-6 w-6 text-orange-600" />
          <h1 className="text-xl font-bold text-orange-800 dark:text-orange-500">QR Menu</h1>
        </Link>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {mounted && (
              <Button variant="ghost" size="icon" onClick={toggleTheme} className="relative">
                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                <span className="sr-only">Toggle theme</span>
              </Button>
            )}
            <Button asChild variant="ghost" size="icon" className="relative">
              <Link href="/profile">
                <User className="h-5 w-5" />
                <span className="sr-only">Profile</span>
              </Link>
            </Button>
          </div>
          <Button variant="ghost" size="icon" className="relative" onClick={onCartClick}>
            <ShoppingCart className="h-5 w-5" />
            {cartItemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {cartItemCount > 99 ? "99+" : cartItemCount}
              </span>
            )}
            <span className="sr-only">Cart</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
