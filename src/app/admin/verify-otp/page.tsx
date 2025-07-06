"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Lock, Mail, Shield } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

export default function AdminVerifyOtpPage() {
  const [otp, setOtp] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otp.trim()) {
      toast({
        title: "Error",
        description: "Please enter the verification code.",
        variant: "destructive",
      })
      return
    }
    setIsVerifying(true)
    try {
      // TODO: Replace with your actual API endpoint for verifying login OTP
      const response = await fetch("/api/admin/login/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: otp.trim() }),
      })
      const data = await response.json()
      if (response.ok) {
        toast({
          title: "Success",
          description: "OTP verified! Redirecting...",
        })
        // Redirect to admin dashboard or welcome page
        setTimeout(() => router.push("/admin/welcome"), 1000)
      } else {
        toast({
          title: "Error",
          description: data.error || data.message || "Invalid or expired OTP.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to verify OTP. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-50 to-orange-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center mb-2">
            <div className="bg-orange-100 p-3 rounded-full">
              <Mail className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">eSewa Credentials Verification</CardTitle>
          <CardDescription>
            <span className="block mb-2">Hello <span className="font-semibold text-orange-700">admin</span>,</span>
            <span className="block">You requested to view your eSewa credentials. Please use the following verification code:</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-6">
            <div className="flex flex-col items-center gap-2">
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="Enter 6-digit code"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, ""))}
                className="text-center text-2xl tracking-widest font-mono py-4 px-6 border-2 border-orange-200 focus:border-orange-500 dark:bg-gray-900 dark:border-orange-700 dark:text-orange-100"
                autoFocus
              />
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                This code will expire in <span className="font-semibold">5 minutes</span>.
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-orange-600 hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-700"
              disabled={isVerifying}
            >
              {isVerifying ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Verifying...
                </>
              ) : (
                "Verify Code"
              )}
            </Button>
          </form>
          <div className="mt-6 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-sm text-yellow-800 dark:text-yellow-200 text-center">
            If you didn't request this verification, please ignore this email.
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 