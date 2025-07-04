import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getApiUrl } from '../../../lib/api-service';

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${getApiUrl()}/api/reviews/csrf/`, {
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    })

    if (!response.ok) {
      throw new Error("Failed to get CSRF token")
    }

    // Get the CSRF token from the response headers
    const csrfToken = response.headers.get("X-CSRFToken")
    
    if (!csrfToken) {
      throw new Error("CSRF token not found in response")
    }

    return NextResponse.json({ csrfToken })
  } catch (error) {
    console.error("Error getting CSRF token:", error)
    return NextResponse.json(
      { error: "Failed to get CSRF token" },
      { status: 500 }
    )
  }
} 