import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-utils'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userData = await verifyToken(token)
    if (!userData) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Check if user is admin or super admin
    if (!userData.is_admin_or_super_admin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Proxy the request to Django backend
    const response = await fetch(`${API_BASE_URL}/api/admin/credentials/`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json(error, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('Error fetching eSewa credentials:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userData = await verifyToken(token)
    if (!userData) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Check if user is admin or super admin
    if (!userData.is_admin_or_super_admin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const { product_code, secret_key, display_name } = body

    // Validation
    if (!product_code || !secret_key) {
      return NextResponse.json(
        { error: 'Product code and secret key are required' },
        { status: 400 }
      )
    }

    if (product_code.length < 3) {
      return NextResponse.json(
        { error: 'Product code must be at least 3 characters long' },
        { status: 400 }
      )
    }

    if (secret_key.length < 8) {
      return NextResponse.json(
        { error: 'Secret key must be at least 8 characters long' },
        { status: 400 }
      )
    }

    // Proxy the request to Django backend
    const response = await fetch(`${API_BASE_URL}/api/admin/credentials/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_code,
        secret_key,
        display_name: display_name || '',
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json(error, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('Error saving eSewa credentials:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 