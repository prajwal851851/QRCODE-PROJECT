'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { XCircle } from 'lucide-react'

export default function EsewaFailurePage() {
  const router = useRouter()

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-[350px]">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <XCircle className="h-16 w-16 text-red-500" />
          </div>
          <CardTitle className="text-center">Payment Failed</CardTitle>
          <CardDescription className="text-center">
            We couldn't process your payment. Please try again or choose a different payment method.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.push('/menu')} className="w-full">
            Return to Menu
          </Button>
        </CardContent>
      </Card>
    </div>
  )
} 