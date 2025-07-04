"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Bell, Search, Moon, Sun, Menu, User } from "lucide-react"
import { useTheme } from "next-themes"
import { useState, useEffect } from "react"
import { SettingsPanel } from "@/components/settings-panel"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { logout, fetchWithAuth, getApiUrl } from '@/lib/api-service'
import { useToast } from '@/hooks/use-toast'
import { PaymentNotificationSystem } from "@/components/payment-notification"
import type { InventoryAlert } from "@/lib/types"
import { useLoading } from '@/contexts/LoadingContext'

interface AdminHeaderProps {
  onMenuClick?: () => void
  title?: string
}

export function AdminHeader({ onMenuClick, title = "Dashboard" }: AdminHeaderProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const { toast } = useToast()
  const [notifications, setNotifications] = useState<InventoryAlert[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [pwForm, setPwForm] = useState({ current: '', new: '', confirm: '' })
  const [changePwError, setChangePwError] = useState('')
  const [changePwSuccess, setChangePwSuccess] = useState('')
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const { setShow } = useLoading()

  const API_BASE_URL = "http://127.0.0.1:8000/api/inventory/"

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const token = localStorage.getItem('adminAccessToken');
        if (!token) return;

        const response = await fetch(`${getApiUrl()}alerts/?is_read=false`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data: InventoryAlert[] = await response.json();
          setNotifications(data.filter(alert => alert.alert_type === 'low_stock'));
        }
      } catch (error) {
        console.error("Failed to fetch notifications:", error)
      }
    }

    fetchAlerts()
    const interval = setInterval(fetchAlerts, 60000) // Fetch every minute

    return () => clearInterval(interval)
  }, [])

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null;

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const markAsRead = async (id: number) => {
    try {
        const token = localStorage.getItem('adminAccessToken');
        if (!token) return;

        const response = await fetch(`${getApiUrl()}alerts/${id}/`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ is_read: true })
        });

        if (response.ok) {
            setNotifications(notifications.filter((n) => n.id !== id));
        }
    } catch (error) {
        console.error("Failed to mark notification as read:", error);
    }
  }

  const markAllAsRead = async () => {
     try {
        const token = localStorage.getItem('adminAccessToken');
        if (!token) return;

        // This is a simplification. A real implementation would have a dedicated backend endpoint.
        const readPromises = notifications.map(n => 
             fetch(`${getApiUrl()}alerts/${n.id}/`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_read: true })
            })
        );
        
        await Promise.all(readPromises);
        setNotifications([]);

    } catch (error) {
        console.error("Failed to mark all notifications as read:", error);
    }
  }

  const handleLogout = () => {
    setShow(true);
    // Get user name for personalized message
    let userName = "Admin"
    if (typeof window !== 'undefined') {
      const userData = JSON.parse(localStorage.getItem("adminUserData") || "{}")
      userName = userData.first_name || userData.username || "Admin"
    }

    // Show personalized toast notification
    toast({
      title: "Logged out successfully",
      description: `Goodbye, ${userName}! You have been successfully logged out. Come back soon!`,
    })

    // Add a small delay to allow the toast to be displayed before redirecting
    setTimeout(() => {
      logout()
      setShow(false)
    }, 1000)
  }

  async function handleChangePassword(e: { preventDefault: () => void }) {
    e.preventDefault();
    setChangePwError('');
    setChangePwSuccess('');
    if (pwForm.new !== pwForm.confirm) {
      setChangePwError('New passwords do not match.');
      return;
    }
    const res = await fetchWithAuth(getApiUrl('authentaction/change-password/'), {
      method: 'POST',
      body: JSON.stringify({
        current_password: pwForm.current,
        new_password: pwForm.new,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setChangePwSuccess('Password changed successfully.');
      setPwForm({ current: '', new: '', confirm: '' });
      setTimeout(() => {
        setShowChangePassword(false);
        handleLogout(); // Force logout after password change
      }, 1500);
    } else {
      setChangePwError(data.error || 'Failed to change password.');
    }
  }

  return (
    <header className="h-16 px-4 border-b flex items-center justify-between bg-white dark:bg-gray-950 dark:border-gray-800">
      <div className="flex items-center gap-4">
        {onMenuClick && (
          <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <h1 className="text-xl font-bold hidden md:block dark:text-white">{title}</h1>
        <div className="relative hidden md:flex items-center">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            type="search"
            placeholder="Search..."
            className="w-[200px] lg:w-[300px] pl-9 rounded-full bg-gray-50 border-gray-200 focus-visible:ring-orange-500 dark:bg-gray-900 dark:border-gray-800"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <PaymentNotificationSystem />
        {mounted && (
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        )}

        <Dialog open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 flex items-center justify-center text-xs"
                >
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex justify-between items-center">
                <span>Notifications</span>
                {unreadCount > 0 && <Badge variant="secondary">{unreadCount} new</Badge>}
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className="flex justify-between items-start gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {n.alert_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} - {n.item?.name || 'Unknown Item'}
                      </p>
                      <p className="text-xs text-muted-foreground">{n.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(n.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsRead(n.id)}
                    >
                      Mark Read
                    </Button>
                  </div>
                ))
              ) : (
                <p className="py-8 text-sm text-center text-muted-foreground">
                  No new notifications
                </p>
              )}
            </div>
            <DialogFooter className="mt-4">
               <Button
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
                className="w-full"
              >
                Mark all as read
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <SettingsPanel />
        <div className="relative">
          <Button variant="ghost" size="icon" aria-label="Profile" onClick={() => setShowDropdown((v) => !v)}>
            <User className="h-5 w-5 text-orange-600" />
          </Button>
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-900 border rounded shadow-lg z-50">
              <button className="w-full flex items-center gap-2 px-4 py-2 hover:bg-orange-50" onClick={() => setShowChangePassword(true)}>
                Change Password
              </button>
              <button className="w-full flex items-center gap-2 px-4 py-2 hover:bg-orange-50 text-red-600" onClick={handleLogout}>
                Logout
              </button>
            </div>
          )}
          <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Change Password</DialogTitle>
                <DialogDescription>
                  Enter your current password and a new password to update your credentials.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleChangePassword} className="space-y-4 py-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <label htmlFor="current-password" className="text-sm font-medium">Current Password</label>
                    <Input
                      id="current-password"
                      type="password"
                      value={pwForm.current}
                      onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="new-password" className="text-sm font-medium">New Password</label>
                    <Input
                      id="new-password"
                      type="password"
                      value={pwForm.new}
                      onChange={e => setPwForm(f => ({ ...f, new: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="confirm-password" className="text-sm font-medium">Confirm New Password</label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={pwForm.confirm}
                      onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                {changePwError && <div className="text-red-600 text-sm">{changePwError}</div>}
                {changePwSuccess && <div className="text-green-600 text-sm">{changePwSuccess}</div>}
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowChangePassword(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white">
                    Change Password
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  )
}
