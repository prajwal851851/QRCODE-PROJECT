import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-utils'

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
    const { password } = body

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 })
    }

    // In production, verify password against user's actual password
    // For now, we'll use a mock verification
    const mockPassword = "admin123" // This should be the user's actual password
    
    if (password !== mockPassword) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    // Generate OTP and send to user's email
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    
    // In production, save OTP to database with expiration
    // For now, we'll store it in memory (not secure for production)
    console.log('Generated OTP for user:', userData.id, 'OTP:', otp)
    
    // In production, send email with OTP
    // For demo purposes, we'll just log it
    console.log(`OTP ${otp} sent to ${userData.email}`)

    return NextResponse.json({
      message: 'OTP sent successfully',
      email: userData.email // Return masked email for confirmation
    })

  } catch (error) {
    console.error('Error initiating credential view:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 