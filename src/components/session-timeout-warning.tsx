"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Clock } from "lucide-react"

interface SessionTimeoutWarningProps {
  isOpen: boolean
  remainingSeconds: number
  onExtendSession: () => void
  onLogout: () => void
}

export function SessionTimeoutWarning({
  isOpen,
  remainingSeconds,
  onExtendSession,
  onLogout,
}: SessionTimeoutWarningProps) {
  // Format the remaining time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto bg-orange-100 p-3 rounded-full mb-4">
            <Clock className="h-6 w-6 text-orange-600" />
          </div>
          <DialogTitle className="text-center">Session Timeout Warning</DialogTitle>
          <DialogDescription className="text-center">
            Your session is about to expire due to inactivity.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-2">You will be logged out in:</p>
            <p className="text-2xl font-bold text-orange-600">{formatTime(remainingSeconds)}</p>
          </div>
        </div>
        <DialogFooter className="flex flex-col sm:flex-row sm:justify-center gap-2">
          <Button variant="outline" onClick={onLogout}>
            Logout Now
          </Button>
          <Button className="bg-orange-600 hover:bg-orange-700" onClick={onExtendSession}>
            Stay Logged In
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
