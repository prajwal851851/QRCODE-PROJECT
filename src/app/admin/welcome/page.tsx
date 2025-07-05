"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { usePermissions } from "@/hooks/use-permissions"
import { Bookmark, BarChart3, CalendarCheck, Coffee, CreditCard, HelpCircle, Info, LayoutDashboard, Loader2, QrCode, Settings, ShoppingCart, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useLoading } from '@/contexts/LoadingContext'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'

export default function WelcomePage() {
  const { setShow } = useLoading();
  const router = useRouter();
  const { toast } = useToast();
  const { userData, hasAnyPermission, loading } = usePermissions()

  useEffect(() => {
    // Hide spinner after welcome page is loaded
    setShow(false);
    // Show welcome toast if flag is set
    if (typeof window !== 'undefined' && localStorage.getItem('showWelcomeToast') === 'true') {
      const name = userData?.first_name || 'User';
      const role = userData?.role || 'admin';
      toast({
        title: 'Login successful',
        description: `Welcome ${name}, you are logged in as ${role} into the dashboard.`,
      });
      localStorage.removeItem('showWelcomeToast');
    }
  }, [setShow, toast]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <RefreshCw className="h-10 w-10 text-orange-500 animate-spin mb-4" />
        <p className="text-lg font-semibold">Please wait…</p>
        <p className="text-sm text-gray-500">Loading section, this may take a few seconds.</p>
      </div>
    )
  }

  // Define the permission-based sections
  const accessibleSections = [
    {
      name: "Dashboard",
      description: "Overview of restaurant metrics and performance",
      icon: LayoutDashboard,
      link: "/admin/dashboard",
      permissions: ["dashboard_view"],
      color: "bg-indigo-100 dark:bg-indigo-900/20",
      textColor: "text-indigo-800 dark:text-indigo-300",
    },
    {
      name: "Orders",
      description: "View and manage customer orders",
      icon: CalendarCheck,
      link: "/admin/orders",
      permissions: ["orders_view", "orders_manage"],
      color: "bg-blue-100 dark:bg-blue-900/20",
      textColor: "text-blue-800 dark:text-blue-300",
    },
    {
      name: "Menu",
      description: "Manage restaurant menu items",
      icon: Coffee,
      link: "/admin/menu",
      permissions: ["menu_view", "menu_edit"],
      color: "bg-green-100 dark:bg-green-900/20",
      textColor: "text-green-800 dark:text-green-300",
    },

    {
      name: "Payments",
      description: "View and process customer payments",
      icon: CreditCard,
      link: "/admin/payments",
      permissions: ["payments_view", "payments_manage"],
      color: "bg-emerald-100 dark:bg-emerald-900/20",
      textColor: "text-emerald-800 dark:text-emerald-300",
    },
    {
      name: "Discounts",
      description: "Manage promotional offers and discounts",
      icon: ShoppingCart,
      link: "/admin/discounts",
      permissions: ["menu_edit"],
      color: "bg-rose-100 dark:bg-rose-900/20",
      textColor: "text-rose-800 dark:text-rose-300",
    },
    {
      name: "Inventory Management",
      description: "Track, manage, and monitor your inventory stock levels and alerts",
      icon: require("lucide-react").Package,
      link: "/admin/inventory",
      permissions: ["inventory_view", "inventory_manage"],
      color: "bg-yellow-100 dark:bg-yellow-900/20",
      textColor: "text-yellow-800 dark:text-yellow-300",
    },
    {
      name: "QR Generator",
      description: "Create and manage QR codes for tables",
      icon: QrCode,
      link: "/admin/qr-generator",
      permissions: ["qr_generate"],
      color: "bg-sky-100 dark:bg-sky-900/20",
      textColor: "text-sky-800 dark:text-sky-300",
    },
    {
      name: "User Management",
      description: "Manage system users and permissions",
      icon: Bookmark,
      link: "/admin/users",
      permissions: ["users_view", "users_manage"],
      color: "bg-purple-100 dark:bg-purple-900/20",
      textColor: "text-purple-800 dark:text-purple-300",
    },
    // {
    //   name: "Settings",
    //   description: "Configure system settings and preferences",
    //   icon: Settings,
    //   link: "/admin/settings/profile",
    //   permissions: ["settings_view", "settings_edit"],
    //   color: "bg-gray-100 dark:bg-gray-800/50",
    //   textColor: "text-gray-800 dark:text-gray-300",
    // },
  ]

  // For super_admin, show all sections. For others, filter based on permissions
  const isSuperAdmin = userData?.role === 'super_admin';
  const userSections = isSuperAdmin
    ? accessibleSections
    : accessibleSections.filter(section => hasAnyPermission(section.permissions))

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Welcome to the Restaurant Management System</CardTitle>
          <CardDescription>
            Hello, {userData?.first_name || "User"}! You're logged in as <span className="font-medium text-orange-700">{userData?.role}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4 bg-orange-50 dark:bg-orange-900/10">
            <div className="flex items-center gap-3">
              <Info className="h-6 w-6 text-orange-600" />
              <h3 className="font-medium">Quick Guide</h3>
            </div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Use the sidebar menu to navigate to your authorized sections. Based on your role and permissions, 
              you have access to the sections listed below.
            </p>
          </div>

          <h3 className="font-medium text-lg mt-6">Your Accessible Sections:</h3>
          
          {userSections.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {userSections.map((section) => (
                <Link 
                  href={section.link} 
                  key={section.name}
                  className="rounded-lg border p-4 transition-all hover:shadow-md hover:border-orange-200 dark:hover:border-orange-800"
                  onClick={(e) => {
                    e.preventDefault();
                    setShow(true);
                    router.push(section.link);
                  }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-full ${section.color}`}>
                      <section.icon className={`h-5 w-5 ${section.textColor}`} />
                    </div>
                    <h3 className="font-medium">{section.name}</h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{section.description}</p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center p-6 rounded-lg border border-dashed">
              <div className="flex flex-col items-center text-center">
                <HelpCircle className="h-8 w-8 text-gray-400 mb-2" />
                <h3 className="font-medium">No Accessible Sections</h3>
                <p className="text-sm text-gray-500 max-w-md">
                  You don't have permissions to access any sections. 
                  Please contact your administrator for assistance.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
