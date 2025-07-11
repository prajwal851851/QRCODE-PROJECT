"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type React from 'react'
import { Toaster } from 'sonner'
import { Toaster as CustomToaster } from '@/components/ui/toaster'
import { SessionTimeoutWarning } from '@/components/session-timeout-warning'
import { useSessionTimeout } from '@/hooks/use-session-timeout'
import { ResponsiveAdminSidebar } from '@/components/responsive-admin-sidebar'
import { ThemeProviderCustom } from '@/components/theme-provider-custom'
import { fetchWithAuth, logout, getApiUrl } from '@/lib/api-service'
import { Sun, Moon, User, LogOut, Settings, KeyRound } from 'lucide-react'
import LoadingOverlay from '@/components/LoadingOverlay'
import { useLoading } from '@/contexts/LoadingContext'
import { useRequireSubscription } from "@/hooks/useRequireSubscription";

function decodeJWT(token: string) {
  if (!token) return null
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useRequireSubscription();
  const [showDropdown, setShowDropdown] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [profileName, setProfileName] = useState('')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [changePwError, setChangePwError] = useState('')
  const [changePwSuccess, setChangePwSuccess] = useState('')
  const [pwForm, setPwForm] = useState({ current: '', new: '', confirm: '' })
  const router = useRouter()
  const { isWarningVisible, remainingSeconds, extendSession, handleLogout } = useSessionTimeout()
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const loading = useLoading();

  // Check if user is authenticated
  useEffect(() => {
    setMounted(true)
    
    // Only access localStorage after component is mounted on client
    if (typeof window !== 'undefined') {
      const adminSession = localStorage.getItem('adminSession')
      const token = localStorage.getItem('adminAccessToken');
      const path = window.location.pathname

      // Skip authentication check for certain pages
      const skipAuthCheck = [
        '/admin/login',
        '/admin/signup', 
        '/admin/forgot-password',
        '/admin/verify-otp',
        '/admin/subscribe',
        '/'
      ];

      if (!adminSession && !skipAuthCheck.includes(path)) {
        router.push('/admin/login?redirect=' + encodeURIComponent(path))
      } else if (token) {
        const payload = decodeJWT(token)
        if (payload && payload.user_id) {
          setProfileName(payload.first_name || payload.name || 'Admin')
        }
        setIsLoading(false)
      } else {
        setIsLoading(false)
      }
    }
  }, [router])

  const handleThemeToggle = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark')
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setChangePwError('')
    setChangePwSuccess('')
    if (pwForm.new !== pwForm.confirm) {
      setChangePwError('New passwords do not match.')
      return
    }
            const res = await fetchWithAuth(getApiUrl() + '/authentaction/change-password/', {
      method: 'POST',
      body: JSON.stringify({
        current_password: pwForm.current,
        new_password: pwForm.new,
      }),
    })
    const data = await res.json()
    if (res.ok) {
      setChangePwSuccess('Password changed successfully.')
      setPwForm({ current: '', new: '', confirm: '' })
      setTimeout(() => setShowChangePassword(false), 1500)
    } else {
      setChangePwError(data.error || 'Failed to change password.')
    }
  }

  // Don't render anything until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <ThemeProviderCustom>
        <div className="min-h-screen flex flex-col">
          <LoadingOverlay show={loading.show} />
          <main className="flex-1 bg-orange-50">
            <div>Loading...</div>
          </main>
        </div>
      </ThemeProviderCustom>
    )
  }

  if (isLoading) {
    return (
      <ThemeProviderCustom>
        <div className="min-h-screen flex flex-col">
          <LoadingOverlay show={loading.show} />
          <main className="flex-1 bg-orange-50">
            <div>Loading...</div>
          </main>
        </div>
      </ThemeProviderCustom>
    )
  }

  return (
    <ThemeProviderCustom>
      <div className="min-h-screen flex flex-col">
        <LoadingOverlay show={loading.show} />
        <main className="flex-1 bg-orange-50">
          <ResponsiveAdminSidebar>{children}</ResponsiveAdminSidebar>
        </main>
        <Toaster />
        <CustomToaster />
        <SessionTimeoutWarning
          isOpen={isWarningVisible}
          remainingSeconds={remainingSeconds}
          onExtendSession={extendSession}
          onLogout={handleLogout}
        />
      </div>
    </ThemeProviderCustom>
  )
}
