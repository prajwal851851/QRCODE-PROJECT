import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    const body = await request.json()
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    // Get all cookies from the request
    const cookies = request.headers.get('cookie') || ''
    
    // Debug logging
    console.log('Verify OTP - Cookies being forwarded:', cookies)
    console.log('Verify OTP - Request body:', body)

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/verify-otp/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Cookie': cookies, // Forward all cookies including session cookies
      },
      credentials: 'include',
      body: JSON.stringify(body),
    })

    const data = await response.json()
    
    if (response.ok) {
      console.log('Verify OTP - Success response:', data)
      return NextResponse.json(data)
    } else {
      console.log('Verify OTP - Error response:', data)
      return NextResponse.json(data, { status: response.status })
    }
  } catch (error) {
    console.error('Error in verify OTP route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 