"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, Star } from "lucide-react"

interface PricingCardProps {
  title: string
  price: string
  description: string
  features: string[]
  buttonText: string
  buttonVariant?: "default" | "outline" | "secondary" | "destructive" | "ghost" | "link"
  popular?: boolean
  onClick: () => void
  disabled?: boolean
}

export function PricingCard({
  title,
  price,
  description,
  features,
  buttonText,
  buttonVariant = "default",
  popular = false,
  onClick,
  disabled = false
}: PricingCardProps) {
  return (
    <Card className={`relative w-full max-w-sm ${popular ? 'border-2 border-blue-500 shadow-lg' : ''}`}>
      {popular && (
        <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white">
          <Star className="w-3 h-3 mr-1" />
          Most Popular
        </Badge>
      )}
      
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-2xl font-bold">{title}</CardTitle>
        <div className="mt-2">
          <span className="text-4xl font-bold">{price}</span>
          {price.includes('/') && (
            <span className="text-gray-500 ml-1">per month</span>
          )}
        </div>
        <CardDescription className="text-sm text-gray-600 mt-2">
          {description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <ul className="space-y-3">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center text-sm">
              <Check className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        
        <Button 
          className="w-full mt-6" 
          variant={buttonVariant}
          onClick={onClick}
          disabled={disabled}
        >
          {buttonText}
        </Button>
      </CardContent>
    </Card>
  )
} 