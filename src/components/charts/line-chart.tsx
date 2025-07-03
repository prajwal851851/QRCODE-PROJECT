"use client"

import { useEffect, useRef } from "react"

interface DataPoint {
  name: string
  value: number
}

interface LineChartProps {
  data?: DataPoint[]
}

// Update the LineChart component to handle undefined data
export function LineChart({ data = [] }: LineChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height)

    // If no data, draw empty state
    if (data.length === 0) {
      ctx.fillStyle = "#9ca3af" // gray-400
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.font = "14px sans-serif"
      ctx.fillText("No data available", rect.width / 2, rect.height / 2)
      return
    }

    // Chart dimensions
    const padding = 40
    const chartWidth = rect.width - padding * 2
    const chartHeight = rect.height - padding * 2

    // Find max value for scaling
    const maxValue = Math.max(...data.map((d) => d.value)) * 1.2 // Add 20% headroom

    // Point spacing
    const pointSpacing = chartWidth / (data.length - 1)

    // Draw axes
    ctx.beginPath()
    ctx.strokeStyle = "#e5e7eb" // gray-200
    ctx.moveTo(padding, padding)
    ctx.lineTo(padding, rect.height - padding)
    ctx.lineTo(rect.width - padding, rect.height - padding)
    ctx.stroke()

    // Draw grid lines
    const gridLines = 5
    ctx.textAlign = "right"
    ctx.textBaseline = "middle"
    ctx.font = "12px sans-serif"
    ctx.fillStyle = "#9ca3af" // gray-400

    for (let i = 0; i <= gridLines; i++) {
      const y = padding + (chartHeight / gridLines) * i
      const value = maxValue - (maxValue / gridLines) * i

      ctx.beginPath()
      ctx.strokeStyle = "#f3f4f6" // gray-100
      ctx.moveTo(padding, y)
      ctx.lineTo(rect.width - padding, y)
      ctx.stroke()

      ctx.fillText(`${value.toFixed(0)}`, padding - 10, y)
    }

    // Draw line
    ctx.beginPath()
    ctx.strokeStyle = "#ea580c" // orange-600
    ctx.lineWidth = 3

    data.forEach((d, i) => {
      const x = padding + i * pointSpacing
      const y = padding + chartHeight - (d.value / maxValue) * chartHeight

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }

      // Draw x-axis labels
      ctx.textAlign = "center"
      ctx.textBaseline = "top"
      ctx.fillStyle = "#4b5563" // gray-600
      ctx.font = "12px sans-serif"
      ctx.fillText(d.name, x, rect.height - padding + 10)
    })

    ctx.stroke()

    // Draw area under the line
    ctx.lineTo(padding + (data.length - 1) * pointSpacing, rect.height - padding)
    ctx.lineTo(padding, rect.height - padding)
    ctx.closePath()

    const gradient = ctx.createLinearGradient(0, padding, 0, rect.height - padding)
    gradient.addColorStop(0, "rgba(234, 88, 12, 0.2)") // orange-600 with opacity
    gradient.addColorStop(1, "rgba(234, 88, 12, 0.0)") // transparent
    ctx.fillStyle = gradient
    ctx.fill()

    // Draw points
    data.forEach((d, i) => {
      const x = padding + i * pointSpacing
      const y = padding + chartHeight - (d.value / maxValue) * chartHeight

      ctx.beginPath()
      ctx.arc(x, y, 5, 0, Math.PI * 2)
      ctx.fillStyle = "#ffffff"
      ctx.strokeStyle = "#ea580c"
      ctx.lineWidth = 2
      ctx.fill()
      ctx.stroke()

      // Draw value above point
      ctx.textAlign = "center"
      ctx.textBaseline = "bottom"
      ctx.fillStyle = "#ea580c" // orange-600
      ctx.font = "bold 12px sans-serif"
      ctx.fillText(`${d.value}`, x, y - 10)
    })
  }, [data])

  return <canvas ref={canvasRef} className="w-full h-full" style={{ width: "100%", height: "100%" }} />
}
