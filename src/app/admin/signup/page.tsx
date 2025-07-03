"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UtensilsCrossed, UserPlus, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { useLoading } from '@/contexts/LoadingContext'
import LoadingOverlay from '@/components/LoadingOverlay'

function validatePassword(password: string) {
  // At least one uppercase, one number, one special char, min 6 chars
  return /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{6,}$/.test(password)
}

export default function SignupPage() {
  const [step, setStep] = useState<"form" | "otp" | "success">("form")
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" })
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const { setShow, show } = useLoading();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!form.name || !form.email || !form.password || !form.confirmPassword) {
      setError("All fields are required.")
      return
    }
    if (!/\S+@\S+\.\S+/.test(form.email)) {
      setError("Email is invalid.")
      return
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.")
      return
    }
    if (!validatePassword(form.password)) {
      setError("Password must have at least one uppercase letter, one number, and one special character.")
      return
    }
    setLoading(true)
    setShow(true)
    try {
      const response = await fetch("http://localhost:8000/authentaction/signup/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          confirm_password: form.confirmPassword,
        }),
      })
      const data = await response.json()
      if (response.ok) {
        setStep("otp")
        toast({ title: "OTP sent", description: "Check your email for the OTP code." })
      } else {
        setError(data.error || "Signup failed.")
      }
    } catch (err) {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
      setShow(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!otp) {
      setError("OTP is required.")
      return
    }
    setLoading(true)
    setShow(true)
    try {
      const response = await fetch("http://localhost:8000/authentaction/verify-otp/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, otp }),
      })
      const data = await response.json()
      if (response.ok) {
        setStep("success")
        toast({ title: "Signup successful", description: "You can now log in." })
      } else {
        setError(data.error || "OTP verification failed.")
      }
    } catch (err) {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
      setShow(false)
    }
  }

  // Hide spinner when form loads
  useEffect(() => { setShow(false); }, [step, setShow]);

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
                {step === "success" ? (
                  <ShieldCheck className="h-6 w-6 text-green-600" />
                ) : (
                  <UserPlus className="h-6 w-6 text-orange-600" />
                )}
              </div>
            </div>
            <CardTitle className="text-2xl text-center">
              {step === "form" && "Admin Signup"}
              {step === "otp" && "Verify OTP"}
              {step === "success" && "Signup Successful"}
            </CardTitle>
            <CardDescription className="text-center">
              {step === "form" && "Create your admin account"}
              {step === "otp" && "Enter the OTP sent to your email address"}
              {step === "success" && "You can now log in with your credentials."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === "form" && (
              <form onSubmit={handleSignup}>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" name="name" value={form.name} onChange={handleChange} placeholder="Your name" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="admin@example.com" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" name="password" type="password" value={form.password} onChange={handleChange} placeholder="Password" />
                    <p className="text-xs text-gray-500">At least 1 uppercase, 1 number, 1 special character</p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input id="confirmPassword" name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} placeholder="Confirm password" />
                  </div>
                  {error && <p className="text-sm text-red-500">{error}</p>}
                  <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700" disabled={loading}>
                    {loading ? "Signing up..." : "Sign Up"}
                  </Button>
                </div>
              </form>
            )}
            {step === "otp" && (
              <form onSubmit={handleVerifyOtp}>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="otp">OTP</Label>
                    <Input id="otp" value={otp} onChange={e => setOtp(e.target.value)} placeholder="Enter OTP" />
                  </div>
                  {error && <p className="text-sm text-red-500">{error}</p>}
                  <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700" disabled={loading}>
                    {loading ? "Verifying..." : "Verify OTP"}
                  </Button>
                </div>
              </form>
            )}
            {step === "success" && (
              <div className="text-center py-4">
                <div className="bg-green-100 text-green-800 p-4 rounded-md mb-4">
                  <p>Signup successful!</p>
                  <p className="text-sm mt-1">You can now log in with your credentials.</p>
                </div>
                <Button asChild className="w-full bg-orange-600 hover:bg-orange-700 mt-2">
                  <Link href="/admin/login">Go to Login</Link>
                </Button>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button variant="ghost" size="sm" asChild onClick={() => setShow(true)}>
              <Link href="/admin/login" className="flex items-center">
                Already have an account? Log in
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