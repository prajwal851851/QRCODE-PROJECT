"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Globe } from "lucide-react"
import i18n from "@/lib/i18n"

const languages = [
  { code: "en", name: "English" },
  { code: "ne", name: "नेपाली" },
  { code: "hi", name: "हिन्दी" },
  { code: "zh", name: "中文" },
  { code: "es", name: "Español" },
]

export function LanguageSelector() {
  const [currentLanguage, setCurrentLanguage] = useState("en")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    // Load saved language from localStorage
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('language') || 'en'
      setCurrentLanguage(savedLanguage)
      i18n.changeLanguage(savedLanguage)
    }
  }, [])

  const handleLanguageChange = (languageCode: string) => {
    setCurrentLanguage(languageCode)
    i18n.changeLanguage(languageCode)
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', languageCode)
    }
  }

  if (!mounted) {
    return (
      <Button variant="ghost" size="sm" className="flex items-center gap-1">
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline-block">English</span>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-1">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline-block">
            {languages.find((lang) => lang.code === currentLanguage)?.name}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className={currentLanguage === language.code ? "bg-orange-50 font-medium" : ""}
          >
            {language.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
