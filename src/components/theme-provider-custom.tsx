"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ThemeProviderProps as NextThemeProviderProps } from "next-themes"

interface ThemeProviderProps extends NextThemeProviderProps {
  children: React.ReactNode
}

interface LayoutSettings {
  menuLayout: "standard" | "compact"
  animationsEnabled: boolean
}

interface ThemeContextType {
  layoutSettings: LayoutSettings
  updateLayoutSettings: (settings: Partial<LayoutSettings>) => void
  layout: "standard" | "compact"
  setLayout: (layout: "standard" | "compact") => void
  animations: boolean
  setAnimations: (enabled: boolean) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function useThemeContext() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useThemeContext must be used within a ThemeProviderCustom")
  }
  return context
}

export function ThemeProviderCustom({
  children,
  defaultTheme = "system",
  enableSystem = true,
  storageKey = "theme",
  themes = ["light", "dark", "system"],
  ...props
}: ThemeProviderProps) {
  const [layoutSettings, setLayoutSettings] = useState<LayoutSettings>({
    menuLayout: "standard",
    animationsEnabled: true,
  })
  const [mounted, setMounted] = useState(false)

  // For compatibility with both implementations
  const layout = layoutSettings.menuLayout
  const animations = layoutSettings.animationsEnabled

  useEffect(() => {
    setMounted(true)
    
    // Only access localStorage after component is mounted on client
    if (typeof window !== 'undefined') {
      const savedSettings = localStorage.getItem("layout-settings")
      if (savedSettings) {
        try {
          const parsedSettings = JSON.parse(savedSettings)
          setLayoutSettings(parsedSettings)

          // Apply layout classes based on saved settings
          applyLayoutSettings(parsedSettings)
        } catch (e) {
          console.error("Failed to parse layout settings:", e)
        }
      }
    }
  }, [])

  const applyLayoutSettings = (settings: LayoutSettings) => {
    if (typeof document === 'undefined') return
    
    const html = document.documentElement

    // Apply menu layout
    if (settings.menuLayout === "compact") {
      html.classList.add("layout-compact")
      html.classList.remove("layout-standard")
    } else {
      html.classList.add("layout-standard")
      html.classList.remove("layout-compact")
    }

    // Apply animations setting
    if (settings.animationsEnabled) {
      html.classList.remove("reduce-motion")
    } else {
      html.classList.add("reduce-motion")
    }
  }

  const updateLayoutSettings = (newSettings: Partial<LayoutSettings>) => {
    const updatedSettings = { ...layoutSettings, ...newSettings }
    setLayoutSettings(updatedSettings)

    // Save to localStorage only on client
    if (typeof window !== 'undefined') {
      localStorage.setItem("layout-settings", JSON.stringify(updatedSettings))
    }

    // Apply the new settings
    applyLayoutSettings(updatedSettings)
  }

  // For compatibility with the other implementation
  const setLayout = (newLayout: "standard" | "compact") => {
    updateLayoutSettings({ menuLayout: newLayout })
  }

  const setAnimations = (enabled: boolean) => {
    updateLayoutSettings({ animationsEnabled: enabled })
  }

  // Don't render anything until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <NextThemesProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={enableSystem}
        storageKey={storageKey}
        themes={themes}
        disableTransitionOnChange
        {...props}
      >
        {children}
      </NextThemesProvider>
    )
  }

  return (
    <ThemeContext.Provider
      value={{
        layoutSettings,
        updateLayoutSettings,
        layout,
        setLayout,
        animations,
        setAnimations,
      }}
    >
      <NextThemesProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={enableSystem}
        storageKey={storageKey}
        themes={themes}
        disableTransitionOnChange
        {...props}
      >
        {children}
      </NextThemesProvider>
    </ThemeContext.Provider>
  )
}

// Export for backward compatibility
export { ThemeProviderCustom as ThemeProvider }
