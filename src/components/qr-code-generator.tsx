import { useEffect, useRef, useState } from "react"
import QRCode from "qrcode"
import { Card } from "@/components/ui/card"

interface TableInfo {
  id: number
  name: string
  section: string
  size: number
  active: boolean
}

interface QRCodeGeneratorProps {
  value: string
  size?: number
  includeTableInfo?: boolean
  includeRestaurantLogo?: boolean
  tableInfo?: TableInfo
  public_id?: string
}

export function QRCodeGenerator({
  value,
  size = 200, // Default size can still be passed
  includeTableInfo = true,
  includeRestaurantLogo = true,
  tableInfo,
  public_id,
}: QRCodeGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [qrSize, setQrSize] = useState(size)

  useEffect(() => {
    // Adjust QR code size based on available screen space
    const adjustSize = () => {
      const maxWidth = window.innerWidth * 0.9 // Max width as 90% of the screen width
      const maxHeight = window.innerHeight * 0.6 // Max height as 60% of the screen height
      const calculatedSize = Math.min(maxWidth, maxHeight, size)

      setQrSize(calculatedSize)
    }

    // Adjust size on initial render and when the window resizes
    adjustSize()
    window.addEventListener("resize", adjustSize)

    // Cleanup event listener on component unmount
    return () => window.removeEventListener("resize", adjustSize)
  }, [size])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const generateQR = async () => {
      try {
        // Set canvas dimensions
        canvas.width = qrSize
        canvas.height = qrSize
        
        // Clear the canvas
        ctx.fillStyle = "#FFFFFF"
        ctx.fillRect(0, 0, qrSize, qrSize)
        
        // Calculate QR code size to ensure it fits properly
        const actualQrSize = Math.min(qrSize - 40, qrSize * 0.8) // Smaller of 40px margin or 80% of container
        
        // Generate the QR code directly on the canvas
        const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://your-frontend-url.vercel.app';
        const qrValue = public_id ? `${frontendUrl}/menu?tableUid=${public_id}` : value
        await QRCode.toCanvas(canvas, qrValue, {
          width: actualQrSize,
          margin: 0, // We're handling the margin ourselves
          errorCorrectionLevel: "H",
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        })
        
        // Don't manipulate the image data further as it may cause quality issues
        // Just let the QR library do its job of rendering to the canvas
        
      } catch (error) {
        console.error("Error generating QR code:", error)
      }
    }

    generateQR()
  }, [value, qrSize, includeTableInfo, includeRestaurantLogo, tableInfo, public_id])

  return (
    <Card className="p-4 flex justify-center items-center bg-white shadow-sm">
      <div className="flex items-center justify-center">
        <canvas ref={canvasRef} style={{ maxWidth: "100%", height: "auto" }} />
      </div>
    </Card>
  )
}
