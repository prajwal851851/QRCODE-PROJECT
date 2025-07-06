"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Shield, Eye, EyeOff, Save, AlertTriangle, CheckCircle, Lock, Key, CreditCard, Globe, Settings } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { usePermissions } from "@/hooks/use-permissions"
import { useLoading } from "@/contexts/LoadingContext"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface EsewaCredentials {
  product_code: string
  secret_key: string
  account_name?: string
  is_configured: boolean
  last_updated?: string
  masked_product_code?: string
  is_active: boolean
  environment?: 'test' | 'production'
}

interface ViewCredentials {
  product_code: string
  secret_key: string
  account_name?: string
  environment?: 'test' | 'production'
}

export default function IntegrateEsewaPage() {
  // All hooks must be called at the top level, before any conditional returns
  const { toast } = useToast()
  const { userData, loading } = usePermissions()
  const { setShow } = useLoading()
  const router = useRouter()

  // All useState hooks
  const [credentials, setCredentials] = useState({
    product_code: "",
    secret_key: "",
    account_name: "",
    is_configured: false,
    last_updated: "",
    masked_product_code: "",
    is_active: false,
    environment: "test" as 'test' | 'production',
  })
  
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showSecretKey, setShowSecretKey] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [otp, setOtp] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [showCredentials, setShowCredentials] = useState(false)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [viewCredentials, setViewCredentials] = useState<ViewCredentials>({
    product_code: "",
    secret_key: "",
    account_name: "",
    environment: "test",
  })
  const [testingSession, setTestingSession] = useState(false)
  const [showDisableModal, setShowDisableModal] = useState(false)
  const [disablePassword, setDisablePassword] = useState("")
  const [disabling, setDisabling] = useState(false)
  const [showEnableModal, setShowEnableModal] = useState(false)
  const [enablePassword, setEnablePassword] = useState("")
  const [enabling, setEnabling] = useState(false)

  // Hidden dummy form to confuse password managers
  const dummyForm = (
    <form style={{ display: 'none' }}>
      <input type="text" name="username" autoComplete="username" />
      <input type="password" name="password" autoComplete="current-password" />
    </form>
  )

  // Define loadCredentials function before useEffect
  const loadCredentials = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem("adminAccessToken")
      const response = await fetch("/api/admin/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include', // Include session cookies
      })
      
      if (response.ok) {
        const data = await response.json()
        setCredentials({
          product_code: "",  // product_code is no longer returned from API
          secret_key: "",
          account_name: data.display_name || "",
          is_configured: data.is_configured || false,
          last_updated: data.updated_at || "",
          masked_product_code: data.masked_product_code || "",
          is_active: data.is_active || false,
          environment: data.environment || "test",
        })
      }
    } catch (error) {
      console.error("Error loading credentials:", error)
    } finally {
      setIsLoading(false)
      // Ensure global loading is hidden after local loading completes
      setShow(false)
    }
  }

  // All useEffect hooks
  useEffect(() => {
    if (!loading && userData) {
      // Only super admin and admin can access this page
      if (userData.role !== 'super_admin' && !userData.is_admin_or_super_admin) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to access this page. Only administrators can configure eSewa integration.",
          variant: "destructive",
        })
        router.push("/admin/dashboard")
        return
      }
      
      // If user has access, load credentials
      if (userData.role === 'super_admin' || userData.is_admin_or_super_admin) {
        setShow(false)
        loadCredentials()
      }
    }
  }, [userData, loading, router, toast])

  // Show loading while checking permissions
  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show access denied if user is not admin
  if (!userData || (userData.role !== 'super_admin' && !userData.is_admin_or_super_admin)) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to access this page.</p>
            <Button 
              onClick={() => router.push("/admin/dashboard")}
              className="mt-4"
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const handleSaveCredentials = async () => {
    if (!credentials.product_code.trim() || !credentials.secret_key.trim()) {
      toast({
        title: "Validation Error",
        description: "Product Code and Secret Key are required.",
        variant: "destructive",
      })
      return
    }

    // Production environment validation
    if (credentials.environment === 'production') {
      const productCode = credentials.product_code.toUpperCase()
      
      // Check for test credentials in production
      if (productCode.startsWith('EP_TEST') || productCode.includes('TEST') || productCode.includes('DEMO')) {
        toast({
          title: "Invalid Production Credentials",
          description: "Production environment cannot use test credentials (EP_TEST, TEST, DEMO). Please use your real eSewa production credentials.",
          variant: "destructive",
        })
        return
      }
      
      // Check if it starts with EPAY
      if (!productCode.startsWith('EPAY')) {
        toast({
          title: "Invalid Production Product Code",
          description: "Production product code must start with 'EPAY'. Please use your real eSewa production credentials.",
          variant: "destructive",
        })
        return
      }
      
      // Show production warning
      const confirmed = window.confirm(
        "⚠️ PRODUCTION ENVIRONMENT WARNING ⚠️\n\n" +
        "You are configuring PRODUCTION eSewa credentials.\n" +
        "This will process REAL MONEY transactions.\n\n" +
        "• Ensure you have a real eSewa business account\n" +
        "• Use your actual production Product Code (starts with EPAY)\n" +
        "• Use your actual production Secret Key\n" +
        "• All customer payments will go to your eSewa account\n\n" +
        "Are you sure you want to proceed with production credentials?"
      )
      
      if (!confirmed) {
        return
      }
    }

    // Check if credentials are already configured
    if (credentials.is_configured) {
      toast({
        title: "Credentials Already Configured",
        description: "You already have eSewa credentials configured. Saving new credentials will replace your existing ones. Are you sure you want to continue?",
        variant: "destructive",
      })
      // You could add a confirmation dialog here if needed
    }

    setIsSaving(true)
    try {
      const token = localStorage.getItem("adminAccessToken")
      const response = await fetch("/api/admin/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          product_code: credentials.product_code,
          secret_key: credentials.secret_key,
          display_name: credentials.account_name,
          environment: credentials.environment,
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `eSewa credentials saved successfully for ${credentials.environment === 'production' ? 'production' : 'test'} environment.`,
        })
        loadCredentials()
        setCredentials(prev => ({
          ...prev,
          product_code: "",
          secret_key: "",
        }))
      } else {
        const errorData = await response.json()
        
        // Extract specific error messages
        let errorMessage = "Failed to save credentials."
        
        if (errorData.product_code) {
          errorMessage = errorData.product_code
        } else if (errorData.secret_key) {
          errorMessage = errorData.secret_key
        } else if (errorData.error) {
          errorMessage = errorData.error
        } else if (errorData.detail) {
          errorMessage = errorData.detail
        } else if (typeof errorData === 'string') {
          errorMessage = errorData
        }
        
        toast({
          title: "Validation Failed",
          description: errorMessage,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error saving credentials:", error)
      toast({
        title: "Error",
        description: "Failed to save credentials. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleViewCredentials = async () => {
    if (!currentPassword.trim()) {
      toast({
        title: "Error",
        description: "Please enter your current password.",
        variant: "destructive",
      })
      return
    }

    setSendingOtp(true)
    try {
      const token = localStorage.getItem("adminAccessToken")
      const response = await fetch("/api/admin/view/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include', // Include session cookies
        body: JSON.stringify({ password: currentPassword }),
      })

      if (response.ok) {
        setOtpSent(true)
        toast({
          title: "OTP Sent",
          description: "Please check your email for the verification code.",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.message || "Invalid password.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send OTP. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSendingOtp(false)
    }
  }

  const handleVerifyOTP = async () => {
    if (!otp.trim()) {
      toast({
        title: "Error",
        description: "Please enter the OTP.",
        variant: "destructive",
      })
      return
    }

    try {
      const token = localStorage.getItem("adminAccessToken")
      const response = await fetch("/api/admin/verify-otp/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include', // Include session cookies
        body: JSON.stringify({ otp: otp.trim() }),
      })

      if (response.ok) {
        const data = await response.json()
        
        // OTP verified successfully, now display credentials directly
        const displayResponse = await fetch("/api/admin/display-securely/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
          body: JSON.stringify({ otp_verified: true }), // Use a simple flag instead of token
        })

        if (displayResponse.ok) {
          // Get the HTML response
          const htmlContent = await displayResponse.text()
          
          // Open credentials in a new window
          const newWindow = window.open('', '_blank', 'width=700,height=600,scrollbars=yes,resizable=yes')
          if (newWindow) {
            newWindow.document.write(htmlContent)
            newWindow.document.close()
          } else {
            toast({
              title: "Error",
              description: "Please allow popups to view credentials securely.",
              variant: "destructive",
            })
          }
          
          setShowPasswordModal(false)
          setCurrentPassword("")
          setOtp("")
          setOtpSent(false)
          toast({
            title: "Success",
            description: "Credentials opened in new window for secure viewing.",
          })
        } else {
          const error = await displayResponse.json()
          toast({
            title: "Error",
            description: error.error || "Failed to display credentials securely.",
            variant: "destructive",
          })
        }
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.message || "Invalid OTP.",
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
      setVerifyingOtp(false)
    }
  }

  const handleDisableEsewa = async () => {
    setDisabling(true)
    try {
      const token = localStorage.getItem("adminAccessToken")
      const response = await fetch("/api/admin/disable/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ password: disablePassword }),
      })
      if (response.ok) {
        toast({
          title: "eSewa Disabled",
          description: "eSewa configuration has been disabled. Customers will no longer see the eSewa payment option.",
        })
        setShowDisableModal(false)
        setDisablePassword("")
        await loadCredentials()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to disable eSewa configuration.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disable eSewa configuration. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDisabling(false)
    }
  }

  const handleEnableEsewa = async () => {
    setEnabling(true)
    try {
      const token = localStorage.getItem("adminAccessToken")
      const response = await fetch("/api/admin/enable/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ password: enablePassword }),
      })
      if (response.ok) {
        toast({
          title: "eSewa Enabled",
          description: "eSewa configuration has been enabled. Customers will now see the eSewa payment option.",
        })
        setShowEnableModal(false)
        setEnablePassword("")
        await loadCredentials()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to enable eSewa configuration.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to enable eSewa configuration. Please try again.",
        variant: "destructive",
      })
    } finally {
      setEnabling(false)
    }
  }

  const maskSecretKey = (key: string) => {
    if (!key) return ""
    if (key.length <= 8) return "*".repeat(key.length)
    return key.substring(0, 4) + "*".repeat(key.length - 8) + key.substring(key.length - 4)
  }

  const testSession = async () => {
    setTestingSession(true)
    try {
      const token = localStorage.getItem("adminAccessToken")
      const response = await fetch("/api/admin/test-session/", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      })

      const data = await response.json()
      
      if (response.ok) {
        toast({
          title: "Session Test Success",
          description: `Session Key: ${data.session_key?.substring(0, 10)}... | Test Value: ${data.test_value}`,
        })
      } else {
        toast({
          title: "Session Test Failed",
          description: data.error || "Session test failed",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Session Test Error",
        description: "Failed to test session",
        variant: "destructive",
      })
    } finally {
      setTestingSession(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading eSewa credentials...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {dummyForm}
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-orange-600 dark:text-orange-500" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">My eSewa Credentials</h1>
          <p className="text-gray-600 dark:text-gray-400">Configure your personal eSewa business account for customer payments</p>
        </div>
      </div>

      {/* Security Alert */}
      <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20">
        <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-500" />
        <AlertDescription className="text-orange-800 dark:text-orange-200">
          <strong>Security Notice:</strong> Your eSewa credentials are encrypted and stored securely. 
          Never share these credentials with anyone. Only you can view and modify them.
        </AlertDescription>
      </Alert>

      {/* Warning when credentials are already configured */}
      {credentials.is_configured && (
        <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20">
          <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
          <AlertDescription className="text-yellow-800 dark:text-yellow-200">
            <strong>Credentials Already Configured:</strong> You already have eSewa credentials set up. 
            If you save new credentials, they will <strong>replace your existing ones</strong>. 
            Make sure you want to update your configuration before proceeding.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Configuration Form */}
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-gray-100">
              <Key className="h-5 w-5" />
              Configure eSewa Credentials
            </CardTitle>
            <CardDescription className="dark:text-gray-400">
              Enter your eSewa business account credentials to enable online payments. 
              Only real, valid eSewa credentials can be saved. If you have issues, contact us at qrmenu851@gmail.com
              <br />
              <span className="text-xs text-orange-600 dark:text-orange-400 mt-2 block">
                🔒 Security: Credentials are encrypted and browser autofill is disabled for enhanced security.
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form 
              autoComplete="off" 
              data-form-type="other"
              onSubmit={(e) => e.preventDefault()}
              className="space-y-4"
            >
            <div className="space-y-2">
              <Label htmlFor="environment" className="dark:text-gray-200">Environment *</Label>
              <Select
                value={credentials.environment}
                onValueChange={(value: 'test' | 'production') => setCredentials(prev => ({ ...prev, environment: value }))}
              >
                <SelectTrigger className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100">
                  <SelectValue placeholder="Select environment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="test">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-blue-500" />
                      Test Environment
                    </div>
                  </SelectItem>
                  <SelectItem value="production">
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4 text-green-500" />
                      Production Environment
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {credentials.environment === 'production' 
                  ? 'Production: Real payments will be processed through eSewa live system'
                  : 'Test: Use eSewa test environment for development and testing'
                }
              </p>
            </div>

            {/* Production Environment Warning */}
            {credentials.environment === 'production' && (
              <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-500" />
                <AlertDescription className="text-red-800 dark:text-red-200">
                  <strong>⚠️ PRODUCTION ENVIRONMENT ⚠️</strong><br />
                  You are configuring PRODUCTION eSewa credentials. This will process REAL MONEY transactions.
                  <br />
                  <strong>Requirements:</strong>
                  <ul className="list-disc list-inside mt-2 ml-2">
                    <li>Real eSewa business account</li>
                    <li>Production Product Code (starts with EPAY)</li>
                    <li>Production Secret Key</li>
                    <li>All payments go to your eSewa account</li>
                  </ul>
                  <strong className="text-red-900 dark:text-red-100">Do NOT use test credentials (EP_TEST) in production!</strong>
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="product_code" className="dark:text-gray-200">eSewa Product Code *</Label>
              <Input
                id="product_code"
                name="esewa_product_code_entry"
                type="text"
                placeholder={credentials.environment === 'production' ? "e.g., EPAY123456" : "e.g., EP_TEST123456"}
                value={credentials.product_code}
                onChange={(e) => setCredentials(prev => ({ ...prev, product_code: e.target.value }))}
                className="font-mono dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                autoComplete="new-password"
                data-form-type="other"
                data-lpignore="true"
                data-1p-ignore="true"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Your unique product code from eSewa business account 
                {credentials.environment === 'production' 
                  ? ' (production codes start with EPAY)'
                  : ' (test codes start with EP_TEST)'
                }
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="x_secret_key_field_123" className="dark:text-gray-200">eSewa Secret Key *</Label>
              <div className="relative">
                <Input
                  id="x_secret_key_field_123"
                  name="x_secret_key_field_123"
                  type={showSecretKey ? "text" : "password"}
                  placeholder="Enter your secret key"
                  value={credentials.secret_key}
                  onChange={(e) => setCredentials(prev => ({ ...prev, secret_key: e.target.value }))}
                  className="font-mono pr-10 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                  autoComplete="new-password"
                  data-form-type="other"
                  data-lpignore="true"
                  data-1p-ignore="true"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent dark:hover:bg-gray-700"
                  onClick={() => setShowSecretKey(!showSecretKey)}
                >
                  {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Your secret key from eSewa business account (will be encrypted). 
                Credentials will be validated before saving.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_name" className="dark:text-gray-200">Account Name (Optional)</Label>
              <Input
                id="account_name"
                name="account_name"
                type="text"
                placeholder="e.g., My Restaurant"
                value={credentials.account_name || ""}
                onChange={(e) => setCredentials(prev => ({ ...prev, account_name: e.target.value }))}
                className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                autoComplete="off"
                data-form-type="other"
                data-lpignore="true"
                data-1p-ignore="true"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Display name for your eSewa account (for reference only)
              </p>
            </div>

            <Separator />

            <Button 
              onClick={handleSaveCredentials} 
              disabled={isSaving}
              className="w-full bg-orange-600 hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-700"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {credentials.is_configured ? "Update Credentials" : "Save Credentials"}
                </>
              )}
            </Button>
            </form>
          </CardContent>
        </Card>

        {/* Current Configuration */}
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-gray-100">
              <CreditCard className="h-5 w-5" />
              Current Configuration
            </CardTitle>
            <CardDescription className="dark:text-gray-400">
              View your current eSewa configuration status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium dark:text-gray-200">Status:</span>
              <Badge variant={credentials.is_configured ? "default" : "secondary"} className={credentials.is_configured ? "bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700" : "dark:bg-gray-600 dark:text-gray-200"}>
                {credentials.is_configured ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Configured
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Not Configured
                  </>
                )}
              </Badge>
            </div>

            {credentials.is_configured && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium dark:text-gray-200">Environment:</span>
                <Badge variant={credentials.environment === 'production' ? "default" : "secondary"} className={credentials.environment === 'production' ? "bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700" : "bg-orange-600 hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-700"}>
                  {credentials.environment === 'production' ? (
                    <>
                      <Settings className="h-3 w-3 mr-1" />
                      Production
                    </>
                  ) : (
                    <>
                      <Globe className="h-3 w-3 mr-1" />
                      Test
                    </>
                  )}
                </Badge>
              </div>
            )}

            {credentials.is_configured && (
              <>
                {/* Product Code is hidden for security */}

                {/* Secret Key is hidden for security - only shown after verification */}

                {credentials.account_name && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium dark:text-gray-200">Account Name:</Label>
                    <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded border dark:border-gray-700 text-sm dark:text-gray-100">
                      {credentials.account_name}
                    </div>
                  </div>
                )}

                {credentials.last_updated && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium dark:text-gray-200">Last Updated:</Label>
                    <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded border dark:border-gray-700 text-sm dark:text-gray-100">
                      {new Date(credentials.last_updated).toLocaleString()}
                    </div>
                  </div>
                )}

                <Separator />

                <Button 
                  variant="outline" 
                  onClick={() => setShowPasswordModal(true)}
                  className="w-full dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  View Full Credentials
                </Button>
              </>
            )}

            {!credentials.is_configured && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <p>No eSewa credentials configured yet.</p>
                <p className="text-sm">Configure your credentials to enable online payments.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Credentials Display Modal */}
      {showCredentials && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-2xl mx-4 border dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold dark:text-gray-100">Your eSewa Credentials</h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setShowCredentials(false)
                  setViewCredentials({
                    product_code: "",
                    secret_key: "",
                    account_name: "",
                    environment: "test",
                  })
                }}
                className="dark:text-gray-400 dark:hover:bg-gray-800"
              >
                ✕
              </Button>
            </div>
            
            <div className="space-y-4">
              {viewCredentials.product_code && viewCredentials.secret_key ? (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium dark:text-gray-200">Product Code:</Label>
                    <Input
                      type="text"
                      value={viewCredentials.product_code}
                      readOnly
                      className="font-mono bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-100"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium dark:text-gray-200">Secret Key:</Label>
                    <div className="relative">
                      <Input
                        type={showSecretKey ? "text" : "password"}
                        value={viewCredentials.secret_key}
                        readOnly
                        className="font-mono bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-100 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowSecretKey(!showSecretKey)}
                      >
                        {showSecretKey ? (
                          <EyeOff className="h-4 w-4 text-gray-500" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-500" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  {viewCredentials.account_name && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium dark:text-gray-200">Account Name:</Label>
                      <Input
                        type="text"
                        value={viewCredentials.account_name}
                        readOnly
                        className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100"
                      />
                    </div>
                  )}
                  
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800 text-sm dark:text-yellow-100 text-yellow-800">
                    ⚠️ Credentials will be hidden in 5 minutes for security
                  </div>
                </>
              ) : (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800 text-sm dark:text-red-100 text-red-800">
                  No credentials data available. Please try again.
                </div>
              )}
              
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowCredentials(false)
                  setViewCredentials({
                    product_code: "",
                    secret_key: "",
                    account_name: "",
                    environment: "test",
                  })
                }}
                className="w-full dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Hide Credentials
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal for Viewing Credentials */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md mx-4 border dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4 dark:text-gray-100">Verify Your Identity</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              For security reasons, please verify your identity to view your credentials.
            </p>
            
            <form autoComplete="off" data-form-type="other" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-4">
              {!otpSent ? (
                <div className="space-y-2">
                  <Label htmlFor="x_verify_admin_456" className="dark:text-gray-200">Current Password</Label>
                  <Input
                    id="x_verify_admin_456"
                    name="x_verify_admin_456"
                    type="password"
                    placeholder="Enter your current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                    autoComplete="new-password"
                    data-form-type="other"
                    data-lpignore="true"
                    data-1p-ignore="true"
                  />
                  <Button 
                    onClick={handleViewCredentials} 
                    disabled={sendingOtp}
                    className="w-full bg-orange-600 hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-700"
                  >
                    {sendingOtp ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Sending OTP...
                      </>
                    ) : (
                      "Send OTP"
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="otp" className="dark:text-gray-200">Verification Code</Label>
                  <Input
                    id="otp"
                    name="otp"
                    type="text"
                    placeholder="Enter 6-digit code from email"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    maxLength={6}
                    className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                    autoComplete="off"
                    data-form-type="other"
                    data-lpignore="true"
                    data-1p-ignore="true"
                  />
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleVerifyOTP} 
                      disabled={verifyingOtp}
                      className="flex-1 bg-orange-600 hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-700"
                    >
                      {verifyingOtp ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Verifying...
                        </>
                      ) : (
                        "Verify"
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setOtpSent(false)
                        setOtp("")
                      }}
                      className="dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                      Back
                    </Button>
                  </div>
                </div>
              )}
              
              <Button 
                variant="ghost" 
                onClick={() => {
                  setShowPasswordModal(false)
                  setCurrentPassword("")
                  setOtp("")
                  setOtpSent(false)
                }}
                className="w-full dark:text-gray-400 dark:hover:bg-gray-800"
              >
                Cancel
              </Button>
            </div>
            </form>
          </div>
        </div>
      )}

      {credentials.is_configured && (
        <div className="flex justify-end mt-4">
          <Button
            variant="destructive"
            onClick={() => setShowDisableModal(true)}
            disabled={isLoading || disabling}
          >
            Disable eSewa
          </Button>
        </div>
      )}
      {showDisableModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md mx-4 border dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4 dark:text-gray-100">Disable eSewa Configuration</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              To disable eSewa, please enter your current password for confirmation.
            </p>
            <form autoComplete="off" data-form-type="other" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-4">
              <Label htmlFor="x_disable_admin_789" className="dark:text-gray-200">Password</Label>
              <Input
                id="x_disable_admin_789"
                name="x_disable_admin_789"
                type="password"
                placeholder="Enter your password"
                value={disablePassword}
                onChange={e => setDisablePassword(e.target.value)}
                className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                autoComplete="new-password"
                data-form-type="other"
                data-lpignore="true"
                data-1p-ignore="true"
              />
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDisableModal(false)
                    setDisablePassword("")
                  }}
                  disabled={disabling}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDisableEsewa}
                  disabled={disabling || !disablePassword.trim()}
                >
                  {disabling ? "Disabling..." : "Disable eSewa"}
                </Button>
              </div>
            </div>
            </form>
          </div>
        </div>
      )}

      {credentials.is_configured && !credentials.is_active && (
        <div className="flex justify-end mt-4">
          <Button
            variant="outline"
            onClick={() => setShowEnableModal(true)}
            disabled={isLoading || enabling}
          >
            Enable eSewa
          </Button>
        </div>
      )}
      {showEnableModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md mx-4 border dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4 dark:text-gray-100">Enable eSewa Configuration</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              To enable eSewa, please enter your current password for confirmation.
            </p>
            <form autoComplete="off" data-form-type="other" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-4">
              <Label htmlFor="x_enable_admin_012" className="dark:text-gray-200">Password</Label>
              <Input
                id="x_enable_admin_012"
                name="x_enable_admin_012"
                type="password"
                placeholder="Enter your password"
                value={enablePassword}
                onChange={e => setEnablePassword(e.target.value)}
                className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                autoComplete="new-password"
                data-form-type="other"
                data-lpignore="true"
                data-1p-ignore="true"
              />
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEnableModal(false)
                    setEnablePassword("")
                  }}
                  disabled={enabling}
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  onClick={handleEnableEsewa}
                  disabled={enabling || !enablePassword.trim()}
                >
                  {enabling ? "Enabling..." : "Enable eSewa"}
                </Button>
              </div>
            </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
} 