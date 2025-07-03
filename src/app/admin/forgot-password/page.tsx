"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UtensilsCrossed, ArrowLeft, Mail, KeyRound } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { useLoading } from '@/contexts/LoadingContext'
import LoadingOverlay from '@/components/LoadingOverlay'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [otp, setOtp] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [resetSuccess, setResetSuccess] = useState(false)

  const { toast } = useToast()
  const { setShow, show } = useLoading();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      setError("Email is required")
      return
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Email is invalid")
      return
    }
    setError(null)
    setIsLoading(true)
    setShow(true)
    try {
      const response = await fetch("http://localhost:8000/authentaction/forgot-password/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await response.json()
      if (response.ok) {
        setIsSubmitted(true)
        toast({
          title: "OTP sent",
          description: "Check your inbox for the OTP code.",
        })
      } else {
        setError(data.error || "Failed to send OTP.")
      }
    } catch (err) {
      setError("Network error. Please try again.")
    } finally {
      setIsLoading(false)
      setShow(false)
    }
  }

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otp || !newPassword || !confirmPassword) {
      setError("All fields are required.")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }
    setError(null)
    setIsLoading(true)
    setShow(true)
    try {
      const response = await fetch("http://localhost:8000/authentaction/reset-password/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, new_password: newPassword }),
      })
      const data = await response.json()
      if (response.ok) {
        setResetSuccess(true)
        toast({
          title: "Password reset successful",
          description: "You can now log in with your new password.",
        })
      } else {
        setError(data.error || "Failed to reset password.")
      }
    } catch (err) {
      setError("Network error. Please try again.")
    } finally {
      setIsLoading(false)
      setShow(false)
    }
  }

  useEffect(() => { setShow(false); }, [isSubmitted, resetSuccess, setShow]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-orange-100 flex flex-col">
      <LoadingOverlay show={show} />
      <header className="container mx-auto p-4">
        <Link href="/" className="flex items-center gap-2">
          <UtensilsCrossed className="h-6 w-6 text-orange-600" />
          <h1 className="text-xl font-bold text-orange-800">QR Menu</h1>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <div className="bg-orange-100 p-3 rounded-full">
                <Mail className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">Reset Password</CardTitle>
            <CardDescription className="text-center">
              {resetSuccess
                ? "Password reset successful!"
                : !isSubmitted
                ? "Enter your email and we'll send you an OTP to reset your password"
                : "Enter the OTP sent to your email and your new password"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isSubmitted && !resetSuccess && (
              <form onSubmit={handleEmailSubmit}>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={error ? "border-red-500" : ""}
                    />
                    {error && <p className="text-sm text-red-500">{error}</p>}
                  </div>
                  <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700" disabled={isLoading}>
                    {isLoading ? "Sending..." : "Send OTP"}
                  </Button>
                </div>
              </form>
            )}
            {isSubmitted && !resetSuccess && (
              <form onSubmit={handleResetSubmit}>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="otp">OTP</Label>
                    <Input
                      id="otp"
                      type="text"
                      placeholder="Enter OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="New password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                  {error && <p className="text-sm text-red-500">{error}</p>}
                  <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700" disabled={isLoading}>
                    {isLoading ? "Resetting..." : "Reset Password"}
                  </Button>
                </div>
              </form>
            )}
            {resetSuccess && (
              <div className="text-center py-4">
                <div className="bg-green-100 text-green-800 p-4 rounded-md mb-4 flex flex-col items-center">
                  <KeyRound className="h-8 w-8 mb-2" />
                  <p>Password reset successful!</p>
                  <p className="text-sm mt-1">You can now log in with your new password.</p>
                </div>
                <Button asChild className="w-full bg-orange-600 hover:bg-orange-700 mt-2">
                  <Link href="/admin/login">Go to Login</Link>
                </Button>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/login" className="flex items-center">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to login
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </main>

      <footer className="bg-orange-800 text-white py-4">
        <div className="container mx-auto px-4 text-center text-orange-200">
          <p>© 2023 QR Menu System. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
