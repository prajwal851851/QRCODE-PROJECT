"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Star } from "lucide-react"
import Image from "next/image"

// Update the MenuItem interface to match our data structure
import type { MenuItem } from "@/lib/menu-data"

interface EnhancedMenuItemCardProps {
  item: MenuItem; // Ensure this matches the `MenuItem` interface
  onAddToCart: (quantity: number) => void; // Function to handle adding to cart
}

export function MenuItemCard({ item, onAddToCart }: EnhancedMenuItemCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="relative">
          <Image
            src={item.image || "/placeholder.svg"}
            alt={item.name}
            width={300}
            height={150}
            className="w-full h-32 object-cover"
          />
          <div className="absolute top-2 right-2 flex gap-1">
            {item.isNew && <Badge className="bg-blue-500">New</Badge>}
            {item.isVegetarian && <Badge className="bg-green-500">Veg</Badge>}
            {item.isSpicy && <Badge className="bg-red-500">Spicy</Badge>}
          </div>
        </div>
        <div className="p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold">{item.name}</h3>
            {item.rating && (
              <div className="flex items-center text-sm text-orange-600">
                <Star className="h-4 w-4 fill-orange-500 text-orange-500 mr-1" />
                {item.rating}
              </div>
            )}
          </div>
          <p className="text-sm text-gray-600 mb-3">{item.description}</p>
          <div className="flex justify-between items-center">
            <div>
              <span className="text-lg font-semibold">Rs {item.price.toFixed(2)}</span>
              {item.originalPrice && (
                <span className="text-sm text-gray-500 line-through ml-2">Rs {item.originalPrice.toFixed(2)}</span>
              )}
            </div>
            <Button
              size="sm"
              className="bg-orange-600 hover:bg-orange-700 hover:scale-105 active:scale-95 transition-transform"
              onClick={() => onAddToCart(1)}
            >
              Add
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
