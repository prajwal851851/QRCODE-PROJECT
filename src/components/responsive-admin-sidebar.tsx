"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { usePermissions } from "@/hooks/use-permissions"
import {
  BarChart3,
  ClipboardList,
  Coffee,
  CreditCard,
  Home,
  LayoutDashboard,
  Menu,
  QrCode,
  Settings,
  ShoppingCart,
  Users,
  X,
  Package,
  Shield,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { AdminHeader } from "@/components/admin-header"
import { useLoading } from '@/contexts/LoadingContext'

interface SidebarProps {
  children: React.ReactNode
}

export function ResponsiveAdminSidebar({ children }: SidebarProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const { userData, hasAnyPermission, loading } = usePermissions()
  const [mounted, setMounted] = useState(false)
  const router = useRouter();
  const { setShow } = useLoading();

  useEffect(() => { setMounted(true) }, [])

  type SubmenuType = {
    label: string;
    href: string;
    active: boolean;
    permissions?: string[];
  };
  type RouteType = {
    label: string;
    icon: any;
    href: string;
    active: boolean;
    permissions: string[];
    submenu?: SubmenuType[];
  };

  const routes: RouteType[] = [
    {
      label: "Welcome",
      icon: Home,
      href: "/admin/welcome",
      active: pathname === "/admin/welcome",
      permissions: [], // Empty array means accessible to everyone
    },
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      href: "/admin/dashboard",
      active: pathname === "/admin/dashboard",
      permissions: ["dashboard_view"], // Basic permission that most roles have
    },
    {
      label: "Orders",
      icon: ClipboardList,
      href: "/admin/orders",
      active: pathname === "/admin/orders",
      permissions: ["orders_view", "orders_manage"],
    },
    {
      label: "Menu",
      icon: Coffee,
      href: "/admin/menu",
      active: pathname === "/admin/menu",
      permissions: ["menu_view", "menu_edit"],
    },
    {
      label: "Inventory",
      icon: Package,
      href: "/admin/inventory",
      active: pathname === "/admin/inventory",
      permissions: ["inventory_view", "inventory_manage"],
    },

    {
      label: "Payments",
      icon: CreditCard,
      href: "/admin/payments",
      active: pathname === "/admin/payments",
      permissions: ["payments_view", "payments_manage"],
    },
    {
      label: "Discounts",
      icon: ShoppingCart,
      href: "/admin/discounts",
      active: pathname === "/admin/discounts",
      permissions: ["menu_edit"],
    },
    {
      label: "QR Generator",
      icon: QrCode,
      href: "/admin/qr-generator",
      active: pathname === "/admin/qr-generator",
      permissions: ["qr_generate"],
    },
    {
      label: "Users",
      icon: Users,
      href: "/admin/users",
      active: pathname === "/admin/users",
      permissions: ["users_view", "users_manage"],
    },
    {
      label: "Integrate eSewa",
      icon: Shield,
      href: "/admin/integrate-esewa",
      active: pathname === "/admin/integrate-esewa",
      permissions: ["admin_only"], // Only admins and super admins can access
    },
    // {
    //   label: "Settings",
    //   icon: Settings,
    //   href: "/admin/settings/profile",
    //   active: pathname?.includes("/admin/settings"),
    //   permissions: ["settings_view", "settings_edit"],
    //   submenu: [
    //     {
    //       label: "Profile",
    //       href: "/admin/settings/profile",
    //       active: pathname === "/admin/settings/profile",
    //       permissions: ["settings_view"],
    //     },
    //     {
    //       label: "Theme",
    //       href: "/admin/settings/theme",
    //       active: pathname === "/admin/settings/theme",
    //       permissions: ["settings_view"],
    //     },
    //   ],
    // },
  ]
  
  // Special check for admin-only features
  const isAdminOnly = (permissions: string[]) => {
    if (!userData) return false
    
    // Super admin and admin can access admin-only features
    if (userData.role === 'super_admin' || userData.is_admin_or_super_admin) return true
    
    // Employees cannot access admin-only features
    return false
  }

  // Filter routes based on permissions
  const filteredRoutes = routes.filter(route => {
    // Special handling for admin-only items
    if (route.permissions.includes('admin_only')) {
      return isAdminOnly(route.permissions)
    }
    // Regular permission check for other items
    return hasAnyPermission(route.permissions)
  }).map(route => {
    // Also filter submenu items if they exist
    if (route.submenu) {
      return {
        ...route,
        submenu: route.submenu.filter(submenu => 
          !submenu.permissions || hasAnyPermission(submenu.permissions)
        )
      }
    }
    return route
  })

  const pageTitle = filteredRoutes.find((route) => route.active)?.label || "Dashboard"

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-950">
      {/* Mobile sidebar */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden fixed left-4 top-4 z-40">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-72">
          <SheetHeader className="px-6 py-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coffee className="h-6 w-6 text-orange-600" />
              <SheetTitle className="text-xl font-bold">QR Menu Admin</SheetTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </Button>
          </SheetHeader>
          <div className="flex flex-col h-full">
            <ScrollArea className="flex-1">
              {userData && (
                <div className="p-4 border-b">
                  <div className="mb-2 px-2">
                    <p className="text-sm font-medium text-gray-700">Logged in as:</p>
                    <p className="text-base font-medium text-orange-700">{userData.first_name} {userData.last_name}</p>
                    <p className="text-xs text-gray-500">{userData.email}</p>
                    <p className="text-xs font-medium mt-1 bg-orange-100 text-orange-800 px-2 py-1 rounded-full inline-block">{userData.role}</p>
                  </div>
                </div>
              )}
              <div className="p-4">
                <nav className="space-y-2">
                  {userData ? filteredRoutes.map((route) => (
                    <div key={route.href}>
                      <a
                        href={route.href}
                        onClick={e => {
                          e.preventDefault();
                          setShow(true);
                          setOpen(false);
                          router.push(route.href);
                        }}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-gray-100 dark:hover:bg-gray-800",
                          route.active
                            ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50"
                            : "text-gray-500 dark:text-gray-400",
                        )}
                      >
                        <route.icon className="h-4 w-4" />
                        {route.label}
                      </a>
                      {route.submenu && route.active && (
                        <div className="ml-6 mt-2 space-y-1">
                          {route.submenu.map((submenu) => (
                            <a
                              key={submenu.href}
                              href={submenu.href}
                              onClick={e => {
                                e.preventDefault();
                                setShow(true);
                                setOpen(false);
                                router.push(submenu.href);
                              }}
                              className={cn(
                                "block rounded-lg px-3 py-2 text-sm transition-all hover:bg-gray-100 dark:hover:bg-gray-800",
                                submenu.active
                                  ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50"
                                  : "text-gray-500 dark:text-gray-400",
                              )}
                            >
                              {submenu.label}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )) : (mounted ? <div className="p-4 text-gray-500">Loading...</div> : null)}
                </nav>
              </div>
            </ScrollArea>
            <div className="p-4 border-t">
              <Link
                href="/"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-500 transition-all hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                <Home className="h-4 w-4" />
                Back to Home
              </Link>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex flex-col flex-1 border-r bg-white dark:bg-gray-900 dark:border-gray-800">
          <div className="flex items-center h-16 px-6 border-b">
            <Link href="/admin/dashboard" className="flex items-center gap-2">
              <Coffee className="h-6 w-6 text-orange-600 dark:text-orange-500" />
              <h1 className="text-xl font-bold text-orange-800 dark:text-orange-400">QR Menu</h1>
            </Link>
          </div>
          <ScrollArea className="flex-1">
            {userData && (
              <div className="p-4 border-b">
                <div className="mb-2 px-2">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Logged in as:</p>
                  <p className="text-base font-medium text-orange-700 dark:text-orange-400">{userData.first_name} {userData.last_name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{userData.email}</p>
                  <p className="text-xs font-medium mt-1 bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-200 px-2 py-1 rounded-full inline-block">{userData.role}</p>
                </div>
              </div>
            )}
            <div className="p-4">
              <nav className="space-y-1">
                {userData ? filteredRoutes.map((route) => (
                  <div key={route.href}>
                    <a
                      href={route.href}
                      onClick={e => {
                        e.preventDefault();
                        setShow(true);
                        router.push(route.href);
                      }}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-gray-100 dark:hover:bg-gray-800",
                        route.active
                          ? "bg-orange-50 text-orange-900 dark:bg-orange-900/20 dark:text-orange-50"
                          : "text-gray-500 dark:text-gray-400",
                      )}
                    >
                      <route.icon
                        className={cn("h-4 w-4", route.active ? "text-orange-600 dark:text-orange-400" : "")}
                      />
                      {route.label}
                    </a>
                    {route.submenu && route.active && (
                      <div className="ml-6 mt-1 space-y-1">
                        {route.submenu.map((submenu) => (
                          <a
                            key={submenu.href}
                            href={submenu.href}
                            onClick={e => {
                              e.preventDefault();
                              setShow(true);
                              router.push(submenu.href);
                            }}
                            className={cn(
                              "block rounded-lg px-3 py-2 text-sm transition-all hover:bg-gray-100 dark:hover:bg-gray-800",
                              submenu.active
                                ? "bg-orange-50 text-orange-900 dark:bg-orange-900/20 dark:text-orange-50"
                                : "text-gray-500 dark:text-gray-400",
                            )}
                          >
                            {submenu.label}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )) : (mounted ? <div className="p-4 text-gray-500 dark:text-gray-400">Loading...</div> : null)}
              </nav>
            </div>
          </ScrollArea>
          <div className="p-4 border-t dark:border-gray-800">
            <Link
              href="/"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-500 transition-all hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <Home className="h-4 w-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="md:pl-64 flex flex-col flex-1">
        <AdminHeader title={pageTitle} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
