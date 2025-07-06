import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-utils'

// Mock decryption function - in production, use proper decryption
const decryptData = (encryptedData: string): string => {
  // This is a placeholder - implement proper decryption
  return atob(encryptedData) // Base64 decoding for demo
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
    const { otp } = body

    if (!otp) {
      return NextResponse.json({ error: 'OTP is required' }, { status: 400 })
    }

    // In production, verify OTP from database with expiration check
    // For demo purposes, we'll use a mock OTP
    const mockOTP = "123456" // This should be the actual OTP from the previous step
    
    if (otp !== mockOTP) {
      return NextResponse.json({ error: 'Invalid OTP' }, { status: 401 })
    }

    // Mock encrypted credentials - in production, fetch from database
    const mockEncryptedCredentials = {
      product_code: btoa("EPAY123456"), // Base64 encoded for demo
      secret_key: btoa("sk_live_1234567890abcdef"), // Base64 encoded for demo
      account_name: "My Restaurant"
    }

    // Decrypt and return credentials
    const decryptedCredentials = {
      product_code: decryptData(mockEncryptedCredentials.product_code),
      secret_key: decryptData(mockEncryptedCredentials.secret_key),
      account_name: mockEncryptedCredentials.account_name
    }

    // Log access for audit trail
    console.log(`User ${userData.id} accessed eSewa credentials at ${new Date().toISOString()}`)

    return NextResponse.json(decryptedCredentials)

  } catch (error) {
    console.error('Error verifying OTP:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 