"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { UtensilsCrossed, Lock, RefreshCw } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { ThemeProviderCustom } from "@/components/theme-provider-custom"
import { useLoading } from '@/contexts/LoadingContext'
import { getApiUrl } from "@/lib/api-service"

export default function AdminLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [showPassword, setShowPassword] = useState(false)
  const { setShow } = useLoading()

  const router = useRouter()
  const { toast } = useToast()

  // Prefill email and password if remembered
  useState(() => {
    const remembered = localStorage.getItem("adminRememberMe") === "true";
    if (remembered) {
      const savedEmail = localStorage.getItem("adminRememberedEmail") || "";
      const savedPassword = localStorage.getItem("adminRememberedPassword") || "";
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberMe(true);
    }
  });

  useEffect(() => {
    // If redirected from logout, keep spinner until login page is loaded, then hide
    if (typeof window !== 'undefined' && localStorage.getItem('showLogoutSpinner') === 'true') {
      setShow(true);
      setTimeout(() => {
        setShow(false);
        localStorage.removeItem('showLogoutSpinner');
      }, 400); // short delay to ensure page is visually loaded
    } else {
      setShow(false);
    }
  }, [])

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {}

    if (!email) {
      newErrors.email = "Email is required"
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Email is invalid"
    }

    if (!password) {
      newErrors.password = "Password is required"
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setShow(true)

    try {
      // Call the Django JWT authentication API with username instead of email
      const response = await fetch(getApiUrl() + "/authentaction/login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          email: email, // Changed from username to email
          password: password 
        }),
      })

      const data = await response.json()

      if (response.ok && data.access && data.refresh) {
        // Store JWT tokens and user data based on role
        if (data.user && (data.user.role === 'employee' || data.user.is_employee)) {
          localStorage.setItem("employeeAccessToken", data.access)
          localStorage.setItem("employeeRefreshToken", data.refresh)
          localStorage.setItem("employeeUserData", JSON.stringify(data.user))
          localStorage.removeItem("adminAccessToken")
          localStorage.removeItem("adminRefreshToken")
          localStorage.removeItem("adminUserData")
        } else {
          localStorage.setItem("adminAccessToken", data.access)
          localStorage.setItem("adminRefreshToken", data.refresh)
          localStorage.setItem("adminUserData", JSON.stringify(data.user))
          localStorage.removeItem("employeeAccessToken")
          localStorage.removeItem("employeeRefreshToken")
          localStorage.removeItem("employeeUserData")
        }
        // Store user role for quick checks
        if (data.user && data.user.role) {
          localStorage.setItem("userRole", data.user.role)
        }
        if (rememberMe) {
          localStorage.setItem("adminRememberMe", "true")
          localStorage.setItem("adminRememberedEmail", email)
          localStorage.setItem("adminRememberedPassword", password)
        } else {
          localStorage.removeItem("adminRememberMe")
          localStorage.removeItem("adminRememberedEmail")
          localStorage.removeItem("adminRememberedPassword")
        }

        // Set a flag to show welcome toast on the welcome page
        localStorage.setItem("showWelcomeToast", "true");
        
        // Dispatch custom event to notify components about user data change
        window.dispatchEvent(new Event('userDataChanged'));
        
        // Small delay to ensure data is properly stored and components are updated
        setTimeout(() => {
          // Redirect to the welcome page (spinner stays until welcome page loads)
          router.push("/admin/welcome");
        }, 100);
      } else {
        toast({
          title: "Login failed",
          description: data.error || data.detail || data.message || "Invalid credentials",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Login error:", error)
      toast({
        title: "Login failed",
        description: "An error occurred during login",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setShow(false)
    }
  }

  return (
    <ThemeProviderCustom>
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-orange-100 flex flex-col">
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-1">
              <div className="flex justify-center mb-4">
                <div className="bg-orange-100 p-3 rounded-full">
                  <Lock className="h-6 w-6 text-orange-600" />
                </div>
              </div>
              <CardTitle className="text-2xl text-center">Admin Login</CardTitle>
              <CardDescription className="text-center">Enter your credentials to access the admin panel</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={errors.email ? "border-red-500" : ""}
                    />
                    {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <Link href="/admin/forgot-password" className="text-sm text-orange-600 hover:underline">
                        Forgot password?
                      </Link>
                    </div>
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={errors.password ? "border-red-500" : ""}
                    />
                    <div className="flex items-center mt-1">
                      <input
                        id="show-password"
                        type="checkbox"
                        checked={showPassword}
                        onChange={() => setShowPassword((v) => !v)}
                        className="mr-2"
                      />
                      <Label htmlFor="show-password" className="text-xs cursor-pointer select-none">
                        Show Password
                      </Label>
                    </div>
                    {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked === true)}
                    />
                    <Label htmlFor="remember" className="text-sm font-normal">
                      Remember me
                    </Label>
                  </div>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-base rounded-lg shadow-lg transition-transform transform hover:scale-105 mt-2"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-5 w-5 animate-spin" />
                        Please wait…
                      </span>
                    ) : (
                      "Login"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
            <CardFooter className="flex flex-col items-center gap-2">
              <p className="text-sm text-gray-500">
                Return to{" "}
                <Link href="/" className="text-orange-600 hover:underline">
                  Home Page
                </Link>
              </p>
              <p className="text-sm">
                Don't have an account?{' '}
                <Link href="/admin/signup" className="text-orange-600 hover:underline">
                  Sign up
                </Link>
              </p>
            </CardFooter>
          </Card>
        </main>

        <footer className="bg-orange-800 text-white py-4">
          <div className="container mx-auto px-4 text-center text-orange-200">
            <p>© QR Menu System. All rights reserved.</p>
          </div>
        </footer>
        <Toaster />
      </div>
    </ThemeProviderCustom>
  )
}
