"use client"

import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  UtensilsCrossed,
  QrCode,
  Settings,
  Users,
  ShoppingCart,
  Menu,
  LogOut,
  Percent,
  Table,
  CreditCard,
  Icon,
  Package,
  Shield,
  Receipt,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { usePermissions } from "@/hooks/use-permissions"

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()
  const { userData, hasAnyPermission, loading } = usePermissions()

  const isActive = (path: string) => {
    return pathname === path || pathname?.startsWith(`${path}/`)
  }

  const handleLogout = () => {
    // Get user name for personalized message
    const userData = JSON.parse(localStorage.getItem("adminUserData") || "{}")
    const userName = userData.first_name || userData.username || "Admin"

    // Clear all admin data
    localStorage.removeItem("adminAccessToken")
    localStorage.removeItem("adminRefreshToken")
    localStorage.removeItem("adminUserData")
    localStorage.removeItem("adminRememberMe")

    // Show personalized toast notification
    toast({
      title: "Logged out successfully",
      description: `Goodbye, ${userName}! You have been successfully logged out. Come back soon!`,
    })

    // Add a small delay to allow the toast to be displayed before redirecting
    setTimeout(() => {
      // Redirect to login page
      router.push("/admin/login")
    }, 1000)
  }

  // Check if user has permission to access a specific feature
  const hasPermission = (requiredPermission: string) => {
    if (!userData) return false
    
    // Super admin has access to all features
    if (userData.role === 'super_admin') return true
    
    // Admin has access to most features
    if (userData.is_admin_or_super_admin) return true
    
    // Check specific permissions
    return userData.permissions && userData.permissions[requiredPermission] === true
  }

  // Special check for admin-only features
  const isAdminOnly = (permissions: string[]) => {
    if (!userData) return false
    
    // Super admin and admin can access admin-only features
    if (userData.role === 'super_admin' || userData.is_admin_or_super_admin) return true
    
    // Employees cannot access admin-only features
    return false
  }

  const menuItems = [
    {
      name: "Dashboard",
      icon: LayoutDashboard,
      path: "/admin/dashboard",
      permissions: ["dashboard_view"], // Basic permission that most roles have
    },
    {
      name: "Menu Management",
      icon: Menu,
      path: "/admin/menu",
      permissions: ["menu_view", "menu_edit"],
    },
    {
      name: "Inventory Management",
      icon: Package,
      path: "/admin/inventory",
      permissions: ["inventory_view", "inventory_manage"],
    },

    {
      name: "Orders",
      icon: ShoppingCart,
      path: "/admin/orders",
      permissions: ["orders_view", "orders_manage"],
    },
    {
      name: "Payments",
      icon: CreditCard,
      path: "/admin/payments",
      permissions: ["payments_view", "payments_manage"],
    },
    {
      name: "Billing",
      icon: Receipt,
      path: "/admin/billing",
      permissions: ["admin_only"], // Only admins and super admins can access billing
    },
    {
      name: "Discounts",
      icon: Percent,
      path: "/admin/discounts",
      permissions: ["menu_edit"],
    },
    {
      name: "QR Generator",
      icon: QrCode,
      path: "/admin/qr-generator",
      permissions: ["qr_generate"],
    },
    {
      name: "Customers",
      icon: Users,
      path: "/admin/customers",
      permissions: ["customers_view"],
    },
    {
      name: "Users",
      icon: Users,
      path: "/admin/users",
      permissions: ["users_view", "users_manage"],
    },
    
    {
      name: "Settings",
      icon: Settings,
      path: "/admin/settings",
      permissions: ["settings_view", "settings_edit"],
    },
    {
      name: "Integrate eSewa",
      icon: Shield,
      path: "/admin/integrate-esewa",
      permissions: ["admin_only"], // Only admins and super admins can access
    },
  ]

  // Filter menu items based on user permissions
  const filteredMenuItems = userData?.role === 'super_admin' 
    ? menuItems // Show all menu items to super_admin
    : menuItems.filter(item => {
        // Special handling for admin-only items
        if (item.permissions.includes('admin_only')) {
          return isAdminOnly(item.permissions)
        }
        // Regular permission check for other items
        return hasAnyPermission(item.permissions)
      })
  
  // If user data isn't loaded yet, show nothing or a loading state
  if (!userData) {
    return (
      <div className="hidden md:flex flex-col w-64 bg-white border-r h-screen">
        <div className="p-4 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="h-6 w-6 text-orange-600" />
            <h1 className="text-xl font-bold text-orange-800">QR Menu</h1>
          </div>
        </div>
        <div className="flex-1 py-6 px-4 flex items-center justify-center">
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="hidden md:flex flex-col w-64 bg-white border-r h-screen">
      {/* Header - Fixed */}
      <div className="p-4 border-b flex-shrink-0">
        <Link href="/admin/dashboard" className="flex items-center gap-2">
          <UtensilsCrossed className="h-6 w-6 text-orange-600" />
          <h1 className="text-xl font-bold text-orange-800">QR Menu</h1>
        </Link>
      </div>

      {/* User Info - Fixed */}
      {userData && (
        <div className="px-4 py-3 border-b flex-shrink-0">
          <p className="text-sm font-medium text-gray-700">Logged in as:</p>
          <p className="text-base font-medium text-orange-700">{userData.first_name} {userData.last_name}</p>
          <p className="text-xs text-gray-500">{userData.email}</p>
          <p className="text-xs font-medium mt-1 bg-orange-100 text-orange-800 px-2 py-1 rounded-full inline-block">{userData.role}</p>
        </div>
      )}

      {/* Navigation - Scrollable */}
      <div className="flex-1 overflow-y-auto adminSidebarScrollbar">
        <div className="py-4 px-4">
          <nav className="space-y-1">
            {filteredMenuItems.map((item) => (
              <Button
                key={item.path}
                variant={isActive(item.path) ? "default" : "ghost"}
                className={`w-full justify-start ${
                  isActive(item.path) ? "bg-orange-600 hover:bg-orange-700 text-white" : "text-gray-700"
                }`}
                asChild
              >
                <Link href={item.path}>
                  <item.icon className="mr-2 h-5 w-5" />
                  {item.name}
                </Link>
              </Button>
            ))}
          </nav>
        </div>
      </div>

      {/* Footer - Fixed */}
      <div className="p-4 border-t flex-shrink-0">
        <Button
          variant="ghost"
          className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-5 w-5" />
          Sign Out
        </Button>
      </div>
    </div>
  )
}
