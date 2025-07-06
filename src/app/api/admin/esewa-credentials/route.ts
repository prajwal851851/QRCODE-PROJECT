import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-utils'

// Mock encryption functions - in production, use proper encryption
const encryptData = (data: string): string => {
  // This is a placeholder - implement proper encryption
  return btoa(data) // Base64 encoding for demo
}

const decryptData = (encryptedData: string): string => {
  // This is a placeholder - implement proper decryption
  return atob(encryptedData) // Base64 decoding for demo
}

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

    // Mock data - in production, fetch from database
    // NEVER log or expose sensitive data
    const mockCredentials = {
      product_code: "EPAY123456",
      secret_key: "sk_live_1234567890abcdef",
      account_name: "My Restaurant",
      is_configured: true,
      last_updated: new Date().toISOString()
    }

    // Return only masked data for security
    // NEVER return full credentials in API responses
    return NextResponse.json({
      product_code: maskSecretKey(mockCredentials.product_code),
      secret_key: maskSecretKey(mockCredentials.secret_key),
      account_name: mockCredentials.account_name,
      is_configured: mockCredentials.is_configured,
      last_updated: mockCredentials.last_updated
    })

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
    const { product_code, secret_key, account_name } = body

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

    // Encrypt sensitive data
    const encryptedSecretKey = encryptData(secret_key)
    const encryptedProductCode = encryptData(product_code)

    // In production, save to database
    // NEVER log sensitive data - even encrypted
    console.log('Saving eSewa credentials for admin:', userData.id)
    console.log('Credentials saved successfully (encrypted)')

    return NextResponse.json({
      message: 'eSewa credentials saved successfully',
      is_configured: true,
      last_updated: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error saving eSewa credentials:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function maskSecretKey(key: string): string {
  if (!key) return ""
  if (key.length <= 8) return "*".repeat(key.length)
  return key.substring(0, 4) + "*".repeat(key.length - 8) + key.substring(key.length - 4)
} 