"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { QrCode, UtensilsCrossed } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { LanguageSelector } from "@/components/language-selector"
import { useLoading } from "@/contexts/LoadingContext"
import LoadingOverlay from "@/components/LoadingOverlay"

export default function Home() {
  const { show, setShow } = useLoading()
  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-orange-100">
      <LoadingOverlay show={show} />
      <header className="container mx-auto p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <UtensilsCrossed className="h-6 w-6 text-orange-600" />
          <h1 className="text-xl font-bold text-orange-800">QR Menu</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/login" onClick={() => setShow(true)}>
              Admin Login
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-orange-900 mb-6">Welcome to the Admin Dashboard</h1>
          <p className="text-lg text-gray-700 mb-8">
            Manage your restaurant operations, menu, orders, tables, and users all in one place.
          </p>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <Card className="bg-white/80 backdrop-blur">
              <CardContent className="pt-6">
                <div className="flex justify-center mb-4">
                  <Image
                    src="https://media.istockphoto.com/id/1192888340/vector/qr-code-icon-vector-illustration-in-flat-design.jpg?s=612x612&w=0&k=20&c=TRBti-3g0hAdbiVGlIrTj-k7W4L0sTEHc3njhJ8-QRY="
                    alt="Menu management - QR code icon"
                    width={64}
                    height={64}
                    className="rounded shadow"
                  />
                </div>
                <h2 className="text-xl font-semibold mb-2">Menu Management</h2>
                <p className="text-gray-600">
                  Add, edit, or remove menu items and categories to keep your offerings up to date.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur">
              <CardContent className="pt-6">
                <div className="flex justify-center mb-4" style={{ background: '#fff', borderRadius: '8px', padding: '8px' }}>
                  <Image
                    src="https://foodship.co.in/wp-content/uploads/2023/05/Order-Management.jpg"
                    alt="Order and table management - restaurant dashboard"
                    width={64}
                    height={64}
                    className="rounded shadow"
                  />
                </div>
                <h2 className="text-xl font-semibold mb-2">Order & Table Management</h2>
                <p className="text-gray-600">
                  Track orders, manage tables, and monitor real-time activity in your restaurant.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-orange-600 hover:bg-orange-700">
              <Link href="/table/1">View Sample Menu</Link>
            </Button>
          </div> */}
        </div>

        <div className="mt-20">
          <h2 className="text-2xl font-bold text-center text-orange-900 mb-8">Admin Features</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: "Analytics & Reports",
                description: "View sales analytics, peak hours, and performance reports to make informed decisions.",
                icon: "https://agencyanalytics.com/_next/image?url=https%3A%2F%2Fimages.ctfassets.net%2Fdfcvkz6j859j%2F1MEC1Kc2RFOGvh79IM5WIc%2F970c042015a4cdefcb6637ad2f8eb7e7%2FSEO-Dashboard-Template-Example.png&w=3840&q=75",
                alt: "Analytics dashboard",
                bg: "#fff"
              },
              {
                title: "Settings & Customization",
                description: "Configure system preferences, themes, and other settings for your restaurant.",
                icon: "https://png.pngtree.com/png-vector/20250307/ourlarge/pngtree-settings-icon-png-image_15738216.png",
                alt: "System Preferences icon - user management",
                bg: "#fff"
              },
              {
                title: "User Management",
                description: "Add or manage staff accounts and assign roles and permissions.",
                icon: "https://www.shutterstock.com/image-vector/access-management-information-accessibility-icons-260nw-2480801187.jpg",
                alt: "Settings and access management icons",
                bg: "#fff"
              },
            ].map((feature, index) => (
              <Card key={index} className="bg-white/80 backdrop-blur">
                <CardContent className="pt-6 text-center">
                  <div className="flex justify-center mb-4" style={feature.bg ? { background: feature.bg, borderRadius: '8px', padding: '8px' } : {}}>
                    <Image src={feature.icon} alt={feature.alt} width={48} height={48} className="rounded shadow" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>

      <footer className="bg-orange-800 text-white py-8 mt-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">About This Dashboard</h3>
              <p className="text-orange-100">
                This admin panel helps you efficiently manage your restaurant's digital menu, orders, tables, Paynments and staff.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact</h3>
              <p className="text-orange-100">Email: qrmenu851@gmail.com</p>
              <p className="text-orange-100">Phone: 9843361311</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Follow Us</h3>
              <div className="flex gap-4">
                <a href="#" className="text-orange-100 hover:text-white">
                  Facebook
                </a>
                <a href="#" className="text-orange-100 hover:text-white">
                  Instagram
                </a>
                <a href="#" className="text-orange-100 hover:text-white">
                  Twitter
                </a>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-orange-700 text-center text-orange-200">
            <p>© 2023 QR Menu System. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
