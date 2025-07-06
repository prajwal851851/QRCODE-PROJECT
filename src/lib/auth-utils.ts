interface UserData {
  id: string
  email: string
  role: string
  is_admin_or_super_admin: boolean
  permissions?: Record<string, boolean>
}

export async function verifyToken(token: string): Promise<UserData | null> {
  try {
    // In production, verify against your Django backend
    // For now, we'll use a mock verification
    
    // Mock user data for demo purposes
    const mockUserData: UserData = {
      id: "1",
      email: "admin@example.com",
      role: "admin",
      is_admin_or_super_admin: true,
      permissions: {
        settings_view: true,
        settings_edit: true,
        menu_view: true,
        menu_edit: true,
        orders_view: true,
        orders_manage: true,
        users_view: true,
        users_manage: true,
        inventory_view: true,
        inventory_manage: true,
        payments_view: true,
        payments_manage: true,
        qr_generate: true,
        customers_view: true,
        customers_manage: true,
        dashboard_view: true,
      }
    }

    // In production, you would:
    // 1. Verify the JWT token
    // 2. Make a request to your Django backend to validate the token
    // 3. Return the actual user data from the backend

    // For demo purposes, we'll just return the mock data
    // if the token exists (basic validation)
    if (token && token.length > 10) {
      return mockUserData
    }

    return null
  } catch (error) {
    console.error('Token verification error:', error)
    return null
  }
}