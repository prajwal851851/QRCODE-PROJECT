import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Define user data type for TypeScript
export type UserData = {
  id: number;
  email: string;
  role: string;
  permissions: Record<string, boolean>;
  is_admin_or_super_admin: boolean;
  first_name: string;
  last_name: string;
};

/**
 * Custom hook for handling user permissions
 * Returns userData and utility functions for checking permissions
 */
export const usePermissions = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Load user data from localStorage on component mount
  useEffect(() => {
    const storedUserData = localStorage.getItem("adminUserData");
    
    if (storedUserData) {
      try {
        const parsedUserData = JSON.parse(storedUserData);
        setUserData(parsedUserData);
      } catch (error) {
        console.error("Error parsing user data:", error);
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  // Check if user has specific permission
  const hasPermission = (permission: string) => {
    if (!userData) return false;
    
    // Super admin always has full access to everything
    if (userData.role === 'super_admin') return true;
    
    // Admin has access to most features
    if (userData.is_admin_or_super_admin) return true;
    
    return userData.permissions && userData.permissions[permission] === true;
  };

  // Check if user has at least one of the required permissions
  const hasAnyPermission = (requiredPermissions: string[]) => {
    if (!userData) return false;
    
    // Super admin always has full access to everything
    if (userData.role === 'super_admin') return true;
    
    // Admin has access to most features
    if (userData.is_admin_or_super_admin) return true;
    
    // Check if user has at least one of the required permissions
    return requiredPermissions.some(permission => 
      userData.permissions && userData.permissions[permission] === true
    );
  };

  // Check if user has access to a specific route
  const hasRouteAccess = (route: string, requiredPermissions: string[]) => {
    return hasAnyPermission(requiredPermissions);
  };

  // Redirect if user doesn't have required permissions
  const redirectIfNoAccess = (requiredPermissions: string[], redirectTo: string = "/admin/login") => {
    if (!loading && !hasAnyPermission(requiredPermissions)) {
      router.push(redirectTo);
    }
  };

  return {
    userData,
    loading,
    hasPermission,
    hasAnyPermission,
    hasRouteAccess,
    redirectIfNoAccess
  };
};
