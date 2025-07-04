"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Bell } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useSearchParams } from "next/navigation"
import { getApiUrl } from '../lib/api-service';

const COOLDOWN_SECONDS = 120

export function CallServerButton({ tableName }: { tableName: string | null }) {
  const [cooldown, setCooldown] = useState(0)
  const [isRequesting, setIsRequesting] = useState(false)
  const [hasActiveCall, setHasActiveCall] = useState(false)
  const { toast } = useToast()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const searchParams = useSearchParams()
  const tableUid = searchParams.get("tableUid")

  // Helper to get the storage key for the current table
  const getStorageKey = () => (tableName ? `waiterCallCooldownEnd_${tableName}` : null)

  // Check for active waiter calls when the page loads
  useEffect(() => {
    if (!tableName) return

    const checkActiveCalls = async () => {
      try {
        const response = await fetch(getApiUrl() + "/api/waiter_call/", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        })
        if (!response.ok) return
        const data = await response.json()
        // Check if there's an active call for this table
        const activeCall = data.find((call: any) => 
          call.status === 'active' && 
          (call.table_name === tableName || call.table === tableName)
        )
        setHasActiveCall(!!activeCall)
        if (activeCall) {
          // Set cooldown based on the active call's creation time
          const createdTime = new Date(activeCall.created_at).getTime()
          const now = Date.now()
          const elapsedSeconds = Math.floor((now - createdTime) / 1000)
          const remainingSeconds = Math.max(0, COOLDOWN_SECONDS - elapsedSeconds)
          if (remainingSeconds > 0) {
            setCooldown(remainingSeconds)
            const end = Math.floor(Date.now() / 1000) + remainingSeconds
            const key = getStorageKey()
            if (key) localStorage.setItem(key, end.toString())
            if (intervalRef.current) clearInterval(intervalRef.current)
            intervalRef.current = setInterval(() => {
              setCooldown((prev) => {
                if (prev <= 1) {
                  if (intervalRef.current) clearInterval(intervalRef.current)
                  if (key) localStorage.removeItem(key)
                  setHasActiveCall(false)
                  return 0
                }
                return prev - 1
              })
            }, 1000)
          }
        }
      } catch (error) {
        console.error('Error checking active calls:', error)
      }
    }

    checkActiveCalls()
  }, [tableName, tableUid])

  // Restore cooldown from localStorage when tableName changes
  useEffect(() => {
    if (!tableName) {
      setCooldown(0)
      return
    }
    const key = getStorageKey()
    if (!key) return
    const cooldownEnd = localStorage.getItem(key)
    if (cooldownEnd) {
      const end = parseInt(cooldownEnd, 10)
      const now = Math.floor(Date.now() / 1000)
      if (end > now) {
        setCooldown(end - now) // Set immediately so badge shows right away
        if (intervalRef.current) clearInterval(intervalRef.current)
        intervalRef.current = setInterval(() => {
          const now = Math.floor(Date.now() / 1000)
          if (end > now) {
            setCooldown(end - now)
          } else {
            setCooldown(0)
            localStorage.removeItem(key)
            if (intervalRef.current) clearInterval(intervalRef.current)
          }
        }, 1000)
        return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
      } else {
        localStorage.removeItem(key)
        setCooldown(0)
      }
    } else {
      setCooldown(0)
    }
    // Clean up interval on unmount or tableName change
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [tableName])

  // When cooldown changes, update localStorage for this table
  useEffect(() => {
    if (!tableName) return
    const key = getStorageKey()
    if (!key) return
    if (cooldown === 0) {
      localStorage.removeItem(key)
    }
  }, [cooldown, tableName])

  const handleCallServer = async () => {
    // Always show notification if there's an active call or cooldown
    if (cooldown > 0 || hasActiveCall) {
      toast({
        title: "Waiter already called",
        description: `You called a waiter already. Try again after ${cooldown}s.`,
        variant: "destructive",
        duration: 5000, // Show for 5 seconds
      })
      return
    }

    if (!tableName) return

    setIsRequesting(true)
    try {
      const body: any = { table_name: tableName }
      if (tableUid) body.table_uid = tableUid
      const response = await fetch(getApiUrl() + "/api/waiter_call/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to call server")
      }
      // Set cooldown and persist end time for this table
      setCooldown(COOLDOWN_SECONDS)
      setHasActiveCall(true)
      const end = Math.floor(Date.now() / 1000) + COOLDOWN_SECONDS
      const key = getStorageKey()
      if (key) localStorage.setItem(key, end.toString())
      toast({
        title: "Server called",
        description: "A server will attend to your table shortly.",
        duration: 5000, // Show for 5 seconds
      })
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current)
            if (key) localStorage.removeItem(key)
            setHasActiveCall(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to call server. Please try again.",
        variant: "destructive",
        duration: 5000, // Show for 5 seconds
      })
    } finally {
      setIsRequesting(false)
    }
  }

  if (!tableName) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2">
      <Button
        onClick={handleCallServer}
        disabled={isRequesting}
        className={`h-14 w-14 rounded-full shadow-lg ${
          isRequesting || cooldown > 0 || hasActiveCall ? "bg-gray-400" : "bg-orange-600 hover:bg-orange-700"
        }`}
      >
        <Bell className="h-6 w-6" />
        <span className="sr-only">Call Server</span>
      </Button>
      <span className="text-xs text-orange-200 font-semibold ml-1">Waiter Call</span>
      {cooldown > 0 && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1">
          {cooldown}s
        </div>
      )}
    </div>
  )
}
