"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Settings } from "lucide-react"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import { useLanguage } from "@/hooks/use-language"

export function SettingsPanel({ onChangePassword }: { onChangePassword?: () => void } = {}) {
  const { theme, setTheme } = useTheme()
  const { currentLanguage, changeLanguage, isReady } = useLanguage()
  const [mounted, setMounted] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  
  // Notification toggle
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  // Language selector
  const [tempLanguage, setTempLanguage] = useState("en")

  useEffect(() => {
    setMounted(true)
    
    // Load settings from localStorage after component is mounted
    if (typeof window !== "undefined") {
      const savedNotifications = localStorage.getItem("notificationsEnabled")
      setNotificationsEnabled(savedNotifications !== "false")
    }
  }, [])

  useEffect(() => {
    if (isReady) {
      setTempLanguage(currentLanguage)
    }
  }, [isReady, currentLanguage])

  // Handlers for new settings
  const handleNotificationsChange = (value: boolean) => {
    setNotificationsEnabled(value)
    if (typeof window !== "undefined") {
      localStorage.setItem("notificationsEnabled", String(value))
    }
  }
  
  const handleLanguageChange = (value: string) => {
    setTempLanguage(value)
  }

  const handleApplyLanguage = () => {
    if (!isReady) return
    
    console.log('SettingsPanel: Applying language change to:', tempLanguage)
    console.log('SettingsPanel: Before change - localStorage:', localStorage.getItem('language'))
    
    // First, save to localStorage
    localStorage.setItem('language', tempLanguage)
    
    // Then change the language
    changeLanguage(tempLanguage)
    
    // Show success message
    const languageNames = {
      'en': 'English',
      'ne': 'Nepali',
      'hi': 'Hindi'
    }
    
    toast.success(`Language changed to ${languageNames[tempLanguage as keyof typeof languageNames]}. Page will refresh in a moment.`)
    
    // Close the settings panel
    setIsOpen(false)
    
    // Force a longer delay to ensure the language is properly saved and applied
    setTimeout(() => {
      console.log('SettingsPanel: Refreshing page. Final localStorage value:', localStorage.getItem('language'))
      window.location.reload()
    }, 2000)
  }

  const handleCancelLanguage = () => {
    setTempLanguage(currentLanguage)
  }

  // Don't render until mounted to prevent hydration mismatch
  if (!mounted || !isReady) {
    return (
      <Button variant="ghost" size="icon">
        <Settings className="h-5 w-5" />
        <span className="sr-only">Settings</span>
      </Button>
    )
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
          <span className="sr-only">Settings</span>
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
          <SheetDescription>Customize your application experience.</SheetDescription>
        </SheetHeader>
        <div className="py-6 space-y-6">
          {/* Appearance (Theme) */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Appearance</h3>
            <RadioGroup
              defaultValue={theme}
              onValueChange={(value) => setTheme(value)}
              className="grid grid-cols-3 gap-2"
            >
              <div>
                <RadioGroupItem value="light" id="light" className="sr-only peer" />
                <Label
                  htmlFor="light"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-white p-4 hover:bg-gray-100 hover:text-gray-900 peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <div className="rounded-md border border-gray-200 bg-white p-2 mb-2">
                    <div className="h-2 w-8 rounded-lg bg-gray-800" />
                  </div>
                  <span className="text-xs">Light</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="dark" id="dark" className="sr-only peer" />
                <Label
                  htmlFor="dark"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-gray-950 p-4 hover:bg-gray-800 hover:text-gray-50 peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <div className="rounded-md border border-gray-700 bg-gray-950 p-2 mb-2">
                    <div className="h-2 w-8 rounded-lg bg-gray-400" />
                  </div>
                  <span className="text-xs text-gray-400">Dark</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="system" id="system" className="sr-only peer" />
                <Label
                  htmlFor="system"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-gradient-to-r from-white to-gray-950 p-4 hover:bg-gradient-to-r hover:from-gray-100 hover:to-gray-800 peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <div className="rounded-md border border-gray-400 bg-gradient-to-r from-white to-gray-950 p-2 mb-2">
                    <div className="h-2 w-8 rounded-lg bg-gradient-to-r from-gray-800 to-gray-400" />
                  </div>
                  <span className="text-xs">System</span>
                </Label>
              </div>
            </RadioGroup>
          </div>
          {/* Notifications toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notifications">Notifications</Label>
              <div className="text-xs text-muted-foreground">Enable or disable notifications</div>
            </div>
            <Switch id="notifications" checked={notificationsEnabled} onCheckedChange={handleNotificationsChange} />
          </div>
          {/* Language selector */}
          <div className="space-y-3">
            <div className="space-y-0.5">
              <Label htmlFor="language">Language</Label>
              <div className="text-xs text-muted-foreground">Select your preferred language</div>
            </div>
            <select
              id="language"
              value={tempLanguage}
              onChange={e => handleLanguageChange(e.target.value)}
              className="border rounded px-2 py-1 bg-background text-foreground w-full"
            >
              <option value="en">English</option>
              <option value="ne">Nepali (नेपाली)</option>
              <option value="hi">Hindi (हिन्दी)</option>
            </select>
            <div className="flex gap-2">
              <Button 
                onClick={handleApplyLanguage}
                className="flex-1 bg-orange-600 hover:bg-orange-700"
                disabled={tempLanguage === currentLanguage}
              >
                Apply Language
              </Button>
              <Button 
                onClick={handleCancelLanguage}
                variant="outline"
                className="flex-1"
                disabled={tempLanguage === currentLanguage}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button>Close</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
