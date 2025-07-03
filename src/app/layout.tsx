import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProviderCustom } from "@/components/theme-provider-custom"
import { Toaster } from "sonner"
import { LoadingProvider } from '@/contexts/LoadingContext'

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "QR Menu - Restaurant Ordering System",
  description: "A modern QR code based menu and ordering system for restaurants",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <LoadingProvider>
          <ThemeProviderCustom>
            {children}
            <Toaster />
          </ThemeProviderCustom>
        </LoadingProvider>
      </body>
    </html>
  )
}
