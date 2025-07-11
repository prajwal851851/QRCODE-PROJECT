import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// Helper to get token from localStorage
function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('adminAccessToken') || localStorage.getItem('employeeAccessToken');
}

function forceLogoutEmployee() {
  // Remove all employee tokens and data
  localStorage.removeItem('employeeAccessToken');
  localStorage.removeItem('employeeRefreshToken');
  localStorage.removeItem('employeeUserData');
  localStorage.removeItem('adminAccessToken'); // In case
  localStorage.removeItem('adminRefreshToken');
  localStorage.removeItem('adminUserData');
  localStorage.removeItem('adminRememberMe');
}

export function useRequireSubscription() {
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    const path = typeof window !== 'undefined' ? window.location.pathname : '/';
    const isAdmin = path.startsWith('/admin');
    const loginUrl = isAdmin ? '/admin/login' : '/login';
    
    // Skip subscription check for certain pages
    const skipSubscriptionCheck = [
      '/admin/login',
      '/admin/signup', 
      '/admin/forgot-password',
      '/admin/verify-otp',
      '/admin/subscribe',
      '/'
    ];
    
    if (skipSubscriptionCheck.includes(path)) {
      return;
    }
    
    if (!token) {
      // Not logged in, redirect to correct login page with redirect parameter
      router.replace(`${loginUrl}?redirect=${encodeURIComponent(path)}`);
      return;
    }

    // Check subscription access
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://qrcode-project-3.onrender.com"}/api/billing/subscription/access/`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })
      .then(async (res) => {
        if (res.status === 200) {
          const data = await res.json();
          if (!data.has_access) {
            // Handle employee vs admin access denial
            if (data.user_type === 'employee') {
              toast.error(data.message || "Access denied. Your admin's subscription has expired.");
              forceLogoutEmployee();
              router.replace('/admin/login?error=no_subscription&message=' + encodeURIComponent(data.message || "Your admin's subscription has expired."));
            } else {
              // Admin without subscription or trial - show error and redirect to subscribe
              if (data.subscription_status === 'pending_payment') {
                router.replace('/admin/subscribe/payment-pending');
                return;
              }
              toast.error(data.message || "Access denied. Please subscribe to continue.");
              router.replace('/admin/subscribe?error=no_subscription&message=' + encodeURIComponent(data.message || "Please subscribe to continue."));
            }
          }
          // If user has access, stay on current page
        } else {
          // No access or error
          const errorData = await res.json().catch(() => ({}));
          if (errorData.user_type === 'employee') {
            toast.error(errorData.message || "Access denied. Your admin's subscription has expired.");
            forceLogoutEmployee();
            router.replace('/admin/login?error=no_subscription&message=' + encodeURIComponent(errorData.message || "Your admin's subscription has expired."));
          } else {
            // Admin without subscription or trial - show error and redirect to subscribe
            toast.error(errorData.message || "Access denied. Please subscribe to continue.");
            router.replace('/admin/subscribe?error=no_subscription&message=' + encodeURIComponent(errorData.message || "Please subscribe to continue."));
          }
        }
      })
      .catch(() => {
        // Error checking subscription - redirect to subscription page for admins
        // For employees, show a generic error and force logout
        const userData = JSON.parse(localStorage.getItem('adminUserData') || localStorage.getItem('employeeUserData') || '{}');
        if (userData.is_employee) {
          toast.error("Unable to verify access. Please contact your admin.");
          forceLogoutEmployee();
          router.replace('/admin/login?error=verification_failed&message=' + encodeURIComponent("Unable to verify access. Please contact your admin."));
        } else {
          toast.error("Unable to verify access. Please subscribe to continue.");
          router.replace('/admin/subscribe?error=verification_failed&message=' + encodeURIComponent("Unable to verify access. Please subscribe to continue."));
        }
      });
  }, [router]);
} 