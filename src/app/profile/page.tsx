"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { UtensilsCrossed, User, History, Gift, CreditCard, LogOut, ChevronRight } from "lucide-react"
import Link from "next/link"
import Image from "next/image"


export default function ProfilePage() {
  // Mock user data
  const user = {
    name: "John Doe",
    email: "john@example.com",
    phone: "+1 (555) 123-4567",
    points: 750,
    nextReward: 1000,
    memberSince: "Jan 2023",
    visits: 12,
  }

  // Mock order history
  const orderHistory = [
    {
      id: "ORD-1234",
      date: "Oct 15, 2023",
      items: ["Grilled Salmon", "Caesar Salad", "Lemonade"],
      total: 42.5,
      status: "Completed",
    },
    {
      id: "ORD-1189",
      date: "Oct 8, 2023",
      items: ["Margherita Pizza", "Garlic Bread", "Tiramisu"],
      total: 36.75,
      status: "Completed",
    },
    {
      id: "ORD-1156",
      date: "Sep 29, 2023",
      items: ["Chicken Curry", "Naan Bread", "Mango Lassi"],
      total: 28.9,
      status: "Completed",
    },
  ]

  // Mock available rewards
  const rewards = [
    {
      id: "RWD-001",
      name: "Free Dessert",
      description: "Choose any dessert from our menu for free",
      pointsCost: 500,
      expiryDate: "Dec 31, 2023",
      image: "/placeholder.svg?height=80&width=80",
    },
    {
      id: "RWD-002",
      name: "10% Off Your Bill",
      description: "Get 10% discount on your total bill",
      pointsCost: 750,
      expiryDate: "Dec 31, 2023",
      image: "/placeholder.svg?height=80&width=80",
    },
    {
      id: "RWD-003",
      name: "Free Appetizer",
      description: "Choose any appetizer from our menu for free",
      pointsCost: 600,
      expiryDate: "Dec 31, 2023",
      image: "/placeholder.svg?height=80&width=80",
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto p-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <UtensilsCrossed className="h-6 w-6 text-orange-600" />
            <h1 className="text-xl font-bold text-orange-800">QR Menu</h1>
          </Link>
          <div className="flex items-center gap-4">
           
            <Link href="/menu">
              <Button variant="outline">View Menu</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="md:w-1/3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>My Profile</CardTitle>
                <CardDescription>Manage your account and rewards</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-orange-100 rounded-full p-3">
                    <User className="h-8 w-8 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{user.name}</h3>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Loyalty Points</span>
                      <span className="text-sm text-orange-600 font-semibold">{user.points} pts</span>
                    </div>
                    <Progress value={(user.points / user.nextReward) * 100} className="h-2 bg-orange-100" />
                    <p className="text-xs text-gray-500 mt-1">
                      {user.nextReward - user.points} more points until your next reward
                    </p>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Member Since</span>
                    <span>{user.memberSince}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Total Visits</span>
                    <span>{user.visits}</span>
                  </div>

                  <div className="pt-4 border-t">
                    <Button variant="outline" className="w-full justify-start">
                      <CreditCard className="mr-2 h-4 w-4" />
                      Payment Methods
                    </Button>
                  </div>

                  <div className="pt-4 border-t">
                    <Button
                      variant="outline"
                      className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="md:w-2/3">
            <Tabs defaultValue="rewards">
              <TabsList className="mb-6">
                <TabsTrigger
                  value="rewards"
                  className="data-[state=active]:bg-orange-100 data-[state=active]:text-orange-900"
                >
                  <Gift className="h-4 w-4 mr-2" />
                  Rewards
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="data-[state=active]:bg-orange-100 data-[state=active]:text-orange-900"
                >
                  <History className="h-4 w-4 mr-2" />
                  Order History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="rewards">
                <Card>
                  <CardHeader>
                    <CardTitle>Available Rewards</CardTitle>
                    <CardDescription>Redeem your points for these exclusive rewards</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {rewards.map((reward) => (
                        <Card key={reward.id} className="overflow-hidden border-orange-200">
                          <CardContent className="p-0">
                            <div className="p-4 flex items-center gap-4">
                              <Image
                                src={reward.image || "/placeholder.svg"}
                                alt={reward.name}
                                width={80}
                                height={80}
                                className="rounded-md"
                              />
                              <div>
                                <h3 className="font-semibold">{reward.name}</h3>
                                <p className="text-sm text-gray-600 mt-1">{reward.description}</p>
                              </div>
                            </div>
                            <div className="bg-orange-50 p-4 flex justify-between items-center">
                              <Badge variant="outline" className="bg-white">
                                {reward.pointsCost} points
                              </Badge>
                              <Button
                                size="sm"
                                disabled={user.points < reward.pointsCost}
                                className={user.points >= reward.pointsCost ? "bg-orange-600 hover:bg-orange-700" : ""}
                              >
                                Redeem
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history">
                <Card>
                  <CardHeader>
                    <CardTitle>Order History</CardTitle>
                    <CardDescription>View your past orders and receipts</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {orderHistory.map((order) => (
                        <div key={order.id} className="border rounded-lg overflow-hidden">
                          <div className="bg-gray-50 p-4 flex justify-between items-center">
                            <div>
                              <h3 className="font-semibold">{order.id}</h3>
                              <p className="text-sm text-gray-500">{order.date}</p>
                            </div>
                            <Badge variant={order.status === "Completed" ? "outline" : "secondary"}>
                              {order.status}
                            </Badge>
                          </div>
                          <div className="p-4">
                            <div className="text-sm mb-3">{order.items.join(", ")}</div>
                            <div className="flex justify-between items-center">
                              <span className="font-semibold">${order.total.toFixed(2)}</span>
                              <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-700">
                                View Details <ChevronRight className="ml-1 h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
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
