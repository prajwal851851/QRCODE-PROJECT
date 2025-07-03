"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

interface SessionTimeoutOptions {
  onTimeout?: () => void
  warningTime?: number // Time in seconds before timeout to show warning
  timeoutDuration?: number // Total session duration in seconds
}

export function useSessionTimeout({
  onTimeout,
  warningTime = 300, // Default 5 minutes warning
  timeoutDuration = 18000, // Default 5 hours session (changed from 3600 seconds/1 hour)
}: SessionTimeoutOptions = {}) {
  const router = useRouter()
  const { toast } = useToast()
  const [isWarningVisible, setIsWarningVisible] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(warningTime)
  const timeoutRef = useRef<NodeJS.Timeout>()
  const warningRef = useRef<NodeJS.Timeout>()

  // Handle logout
  const handleLogout = useCallback(() => {
    // Get user name for personalized message
    const userData = JSON.parse(localStorage.getItem("adminUserData") || "{}")
    const userName = userData.first_name || userData.username || "Admin"

    // Clear session data
    localStorage.removeItem("adminSession")
    localStorage.removeItem("adminAccessToken")
    localStorage.removeItem("adminRefreshToken")

    // Show personalized toast notification
    toast({
      title: "Session ended",
      description: `Goodbye, ${userName}! Your session has ended due to inactivity. Please log in again to continue.`,
      variant: "destructive",
    })

    // Call onTimeout callback if provided
    if (onTimeout) {
      onTimeout()
    }

    // Redirect to login page
    router.push("/admin/login")
  }, [router, toast, onTimeout])

  // Extend session
  const extendSession = useCallback(() => {
    setIsWarningVisible(false)
    setRemainingSeconds(warningTime)
    
    // Reset the timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current)
    }

    // Set new timeout
    warningRef.current = setTimeout(() => {
      setIsWarningVisible(true)
      setRemainingSeconds(warningTime)
    }, (timeoutDuration - warningTime) * 1000)

    timeoutRef.current = setTimeout(() => {
      handleLogout()
    }, timeoutDuration * 1000)
  }, [warningTime, timeoutDuration, handleLogout])

  // Set up session timeout
  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window === "undefined") return

    // Set initial timeout
    warningRef.current = setTimeout(() => {
      setIsWarningVisible(true)
      setRemainingSeconds(warningTime)
    }, (timeoutDuration - warningTime) * 1000)

    timeoutRef.current = setTimeout(() => {
      handleLogout()
    }, timeoutDuration * 1000)

    // Set up event listener for page unload/refresh
    const handleBeforeUnload = () => {
      handleLogout()
    }

    // Add event listener for page unload/refresh
    window.addEventListener("beforeunload", handleBeforeUnload)

    // Clean up
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (warningRef.current) {
        clearTimeout(warningRef.current)
      }
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [handleLogout, warningTime, timeoutDuration])

  // Countdown timer
  useEffect(() => {
    if (!isWarningVisible) return

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          handleLogout()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isWarningVisible, handleLogout])

  return {
    isWarningVisible,
    remainingSeconds,
    extendSession,
    handleLogout,
  }
}
