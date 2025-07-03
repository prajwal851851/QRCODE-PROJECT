"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart, Star, Clock } from "lucide-react"
import Image from "next/image"
import { LanguageSelector } from "@/components/language-selector"
import { MenuItemCard } from "@/components/menu-item-card"
import { CartSidebar } from "@/components/cart-sidebar"
import { DiningOptions } from "@/components/dining-options"
// Import the MenuData interface
import { menuData } from "@/lib/menu-data"
import { TableHeader } from "@/components/table-header"
import { CallServerButton } from "@/components/call-server-button"

interface TablePageProps {
  params: {
    id: string
  }
}

export default function TablePage({ params }: TablePageProps) {
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [cartItems, setCartItems] = useState<any[]>([])
  const [selectedCategory, setSelectedCategory] = useState("starters")
  const tableId = Number.parseInt(params.id)

  const addToCart = (item: any) => {
    const existingItem = cartItems.find((cartItem) => cartItem.id === item.id)

    if (existingItem) {
      setCartItems(
        cartItems.map((cartItem) =>
          cartItem.id === item.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem,
        ),
      )
    } else {
      setCartItems([...cartItems, { ...item, quantity: 1 }])
    }
  }

  const removeFromCart = (itemId: string) => {
    setCartItems(cartItems.filter((item) => item.id !== itemId))
  }

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId)
      return
    }

    setCartItems(cartItems.map((item) => (item.id === itemId ? { ...item, quantity } : item)))
  }

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <TableHeader tableNumber={tableId} cartItemCount={totalItems} onCartClick={() => setIsCartOpen(true)} />

      <main className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Our Menu</h1>
          <LanguageSelector />
        </div>

        <Card className="mb-6 bg-orange-50 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="bg-orange-100 p-3 rounded-full">
                <ShoppingCart className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h2 className="font-semibold text-lg text-orange-800">Table {tableId}</h2>
                <p className="text-orange-700">Your order will be served to this table</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-6">
          <div>
            <DiningOptions />

            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
              <h2 className="text-lg font-semibold mb-3">Today's Specials</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {menuData.specials.map((item) => (
                  <Card
                    key={item.id}
                    className="overflow-hidden border-orange-200 bg-gradient-to-br from-orange-50 to-white"
                  >
                    <CardContent className="p-0">
                      <div className="relative">
                        <Image
                          src={item.image || "/placeholder.svg"}
                          alt={item.name}
                          width={300}
                          height={150}
                          className="w-full h-32 object-cover"
                        />
                        <Badge className="absolute top-2 right-2 bg-orange-600">Special Offer</Badge>
                      </div>
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold">{item.name}</h3>
                          <div className="flex items-center text-sm text-orange-600">
                            <Star className="h-4 w-4 fill-orange-500 text-orange-500 mr-1" />
                            {item.rating}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="text-lg font-semibold">${item.price.toFixed(2)}</span>
                            {item.originalPrice && (
                              <span className="text-sm text-gray-500 line-through ml-2">
                                ${item.originalPrice.toFixed(2)}
                              </span>
                            )}
                          </div>
                          <Button
                            size="sm"
                            className="bg-orange-600 hover:bg-orange-700"
                            onClick={() => addToCart(item)}
                          >
                            Add
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Tabs defaultValue={selectedCategory} onValueChange={setSelectedCategory} className="mb-6">
              <TabsList className="bg-white mb-4 flex overflow-x-auto hide-scrollbar">
                {Object.keys(menuData.categories).map((category) => (
                  <TabsTrigger
                    key={category}
                    value={category}
                    className="data-[state=active]:bg-orange-100 data-[state=active]:text-orange-900"
                  >
                    {menuData.categories[category].name}
                  </TabsTrigger>
                ))}
              </TabsList>

              {Object.keys(menuData.categories).map((category) => (
                <TabsContent key={category} value={category} className="mt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {menuData.categories[category].items.map((item) => (
                      <MenuItemCard key={item.id} item={item} onAddToCart={() => addToCart(item)} />
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>

          <div className="hidden md:block">
            <div className="bg-white rounded-lg shadow-sm p-4 sticky top-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Your Order</h2>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>25-35 min</span>
                </Badge>
              </div>

              {cartItems.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">Your cart is empty</p>
                  <p className="text-sm text-gray-400 mt-1">Add items from the menu to get started</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 mb-4 max-h-[400px] overflow-y-auto pr-2">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex justify-between items-center border-b border-gray-100 pb-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{item.name}</h4>
                          <div className="flex items-center mt-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6 rounded-full"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            >
                              <span>-</span>
                            </Button>
                            <span className="mx-2 text-sm w-6 text-center">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6 rounded-full"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            >
                              <span>+</span>
                            </Button>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                          <button
                            type="button"
                            className="h-6 px-1 text-gray-400 hover:text-red-500 text-sm"
                            onClick={() => removeFromCart(item.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-gray-200 pt-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>${totalPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Service Fee</span>
                      <span>${(totalPrice * 0.05).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span>${(totalPrice * 1.05).toFixed(2)}</span>
                    </div>
                  </div>

                  <Button className="w-full mt-4 bg-orange-600 hover:bg-orange-700">Proceed to Checkout</Button>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <CartSidebar
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        updateQuantity={updateQuantity}
        removeFromCart={removeFromCart}
        totalPrice={totalPrice}
      />

      <CallServerButton />
    </div>
  )
}
