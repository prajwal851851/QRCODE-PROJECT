"use client"

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '@/lib/i18n'

export function useLanguage() {
  const { t, i18n: i18nFromHook } = useTranslation()
  const [currentLanguage, setCurrentLanguage] = useState('en')
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const initializeLanguage = () => {
      const savedLanguage = localStorage.getItem('language') || 'en'
      setCurrentLanguage(savedLanguage)
      setIsReady(true)
      if (i18n.language !== savedLanguage) {
        i18n.changeLanguage(savedLanguage)
      }
    }
    if (i18n.isInitialized) {
      initializeLanguage()
    } else {
      const checkInitialized = () => {
        if (i18n.isInitialized) {
          initializeLanguage()
        } else {
          setTimeout(checkInitialized, 100)
        }
      }
      checkInitialized()
    }
  }, [])

  const changeLanguage = (language: string) => {
    setCurrentLanguage(language)
    i18n.changeLanguage(language)
    localStorage.setItem('language', language)
  }

  return {
    currentLanguage,
    changeLanguage,
    isReady,
    t
  }
} 