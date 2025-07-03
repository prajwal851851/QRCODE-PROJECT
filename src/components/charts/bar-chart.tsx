"use client"

import { useEffect, useRef } from "react"

interface DataPoint {
  name: string
  value: number
}

// Update the BarChart component to handle undefined data
export function BarChart({ data = [] }: { data?: { name: string; value: number }[] }) {
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
    const maxValue = Math.max(...data.map((d) => d.value))

    // Bar width
    const barWidth = (chartWidth / data.length) * 0.7
    const barSpacing = chartWidth / data.length

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

      ctx.fillText(`$${value.toFixed(0)}`, padding - 10, y)
    }

    // Draw bars
    data.forEach((d, i) => {
      const x = padding + i * barSpacing + (barSpacing - barWidth) / 2
      const barHeight = (d.value / maxValue) * chartHeight
      const y = rect.height - padding - barHeight

      // Draw bar
      const gradient = ctx.createLinearGradient(0, y, 0, rect.height - padding)
      gradient.addColorStop(0, "#ea580c") // orange-600
      gradient.addColorStop(1, "#fdba74") // orange-300

      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.roundRect(x, y, barWidth, barHeight, 4)
      ctx.fill()

      // Draw label
      ctx.textAlign = "center"
      ctx.textBaseline = "top"
      ctx.fillStyle = "#4b5563" // gray-600
      ctx.fillText(d.name, x + barWidth / 2, rect.height - padding + 10)

      // Draw value
      ctx.textAlign = "center"
      ctx.textBaseline = "bottom"
      ctx.fillStyle = "#ea580c" // orange-600
      ctx.font = "bold 12px sans-serif"
      ctx.fillText(`$${d.value}`, x + barWidth / 2, y - 5)
    })
  }, [data])

  return <canvas ref={canvasRef} className="w-full h-full" style={{ width: "100%", height: "100%" }} />
}
