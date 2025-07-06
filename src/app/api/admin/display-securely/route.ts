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
    console.log('Display securely - Cookies being forwarded:', cookies)
    console.log('Display securely - Request body:', body)

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/display-securely/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Cookie': cookies, // Forward all cookies including session cookies
      },
      credentials: 'include',
      body: JSON.stringify(body),
    })

    if (response.ok) {
      // Return the HTML content directly
      const htmlContent = await response.text()
      return new NextResponse(htmlContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
        },
      })
    } else {
      const data = await response.json()
      console.log('Display securely - Error response:', data)
      return NextResponse.json(data, { status: response.status })
    }
  } catch (error) {
    console.error('Error in display securely route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 