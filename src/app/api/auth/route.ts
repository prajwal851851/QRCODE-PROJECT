import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// This is a simple mock authentication API
// In a real application, you would validate against a database
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Simple validation - in a real app, you'd check against a database
    if (email === "admin@example.com" && password === "password123") {
      // Create a session
      const session = {
        email,
        role: "admin",
        name: "Admin User",
        loginTime: new Date().toISOString(),
      }

      // Return success with the session data
      return NextResponse.json({
        success: true,
        message: "Authentication successful",
        session,
      })
    }

    // Authentication failed
    return NextResponse.json({ success: false, message: "Invalid email or password" }, { status: 401 })
  } catch (error) {
    console.error("Authentication error:", error)
    return NextResponse.json({ success: false, message: "Authentication failed" }, { status: 500 })
  }
}
