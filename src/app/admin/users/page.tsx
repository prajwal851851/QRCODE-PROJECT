"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, MoreHorizontal, UserPlus, UserCheck, UserX, Shield, ShieldAlert, Trash2, X, RefreshCw } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useLoading } from '@/contexts/LoadingContext'
import { toast } from "sonner"
// Using only one useToast import from component library
import { getApiUrl } from '../../../lib/api-service';

// Define user types and roles
type UserRole = "super_admin" | "admin" | "menu_manager" | "order_manager" | "customer_support" | "account_manager" | "qr_code_manager" | "inventory_manager"
type UserStatus = "active" | "inactive" | "pending"

interface Permission {
  id: string
  name: string
  description: string
}

interface User {
  id: string
  username: string
  first_name: string
  last_name: string
  email: string
  role: UserRole
  status: UserStatus
  lastLogin?: string
  permissions: Record<string, boolean>
  createdAt: string
  created_by: string | null
  is_employee?: boolean
  is_staff?: boolean
}

// Add this function at the top of your component, before the UsersPage function
const getCSRFToken = () => {
  const name = 'csrftoken';
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false)
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  // Add state for role confirmation dialog
  const [isRoleConfirmDialogOpen, setIsRoleConfirmDialogOpen] = useState(false)
  const [pendingRoleChange, setPendingRoleChange] = useState<{user: User, newRole: UserRole} | null>(null)
  const { setShow } = useLoading();

  useEffect(() => { setShow(false); }, [setShow]);

  // Fetch users on component mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("adminAccessToken");
        console.log("Token from localStorage:", token ? "exists" : "missing");
        
        if (!token) {
          console.error("No authentication token found");
          window.location.href = '/admin/login';
          return;
        }

        // Decode and log token details
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          console.log("Token payload:", payload);
          console.log("Token expiration:", new Date(payload.exp * 1000).toLocaleString());
          
          if (Date.now() >= payload.exp * 1000) {
            console.error("Token has expired");
            localStorage.removeItem("adminAccessToken");
            window.location.href = '/admin/login';
            return;
          }
        }

        const headers = {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRFToken": getCSRFToken(),
        };
        console.log("Request headers:", headers);
        
        // First get current user data to determine role and permissions
        const currentUserResponse = await fetch(`${getApiUrl()}/api/user_role/users/me/`, {
          headers: {
            ...headers,
            "X-CSRFToken": headers["X-CSRFToken"] || "",
          },
          credentials: 'include',
        });
        
        if (!currentUserResponse.ok) {
          throw new Error("Failed to fetch current user data");
        }
        
        const currentUserData = await currentUserResponse.json();
        console.log("Current user data:", currentUserData);
        
        if (!currentUserData.is_admin_or_super_admin) {
          throw new Error("You don't have permission to view users. Only admins can access this page.");
        }
        
        // Store current user data for permission checks elsewhere
        // This helps ensure we know the logged-in user throughout the component
        localStorage.setItem("currentUserData", JSON.stringify({
          id: currentUserData.id,
          role: currentUserData.role,
          username: currentUserData.username
        }));
        
        // Determine which endpoint to use based on user role
        let usersEndpoint = `${getApiUrl()}/api/user_role/users/`;
        
        // If the user is a regular admin (not super_admin), get only users they created AND themselves
        if (currentUserData.role === 'admin') {
          usersEndpoint = `${getApiUrl()}/api/user_role/users/my-users/`;
        }
        
        const response = await fetch(usersEndpoint, {
          method: 'GET',
          headers: {
            ...headers,
            "X-CSRFToken": headers["X-CSRFToken"] || "",
          },
          credentials: 'include',
        });

        console.log("Response status:", response.status);

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Error response:", errorData);
          
          if (response.status === 401) {
            console.error("Token is invalid or expired");
            localStorage.removeItem("adminAccessToken");
            window.location.href = '/admin/login';
            return;
          }
          
          throw new Error(errorData.detail || "Failed to fetch users");
        }

        let data = await response.json();
        console.log("Users data:", data);
        
        // Debug logging for each user's created_by field
        data.forEach((user: any) => {
          console.log(`User ${user.username} (${user.id}):`, {
            role: user.role,
            created_by: user.created_by,
            created_by_id: user.created_by_id,
            created_by_username: user.created_by_username
          });
        });
        
        // Filter users based on role and permissions
        console.log("BEFORE FRONTEND FILTERING - Users data:", data);
        console.log("Current user role and ID:", currentUserData.role, currentUserData.id);
        
        // Filter users based on role
        data = data.filter((user: { username: any; id: any; created_by: any; role: string }) => {
          // Always include the current user (self)
          if (user.id === currentUserData.id) {
            console.log(`KEEPING: Self user ${user.id}`);
            return true;
          }
          
          // For super_admin, show all users
          if (currentUserData.role === 'super_admin') {
            console.log(`KEEPING: User ${user.id} - super_admin can see all users`);
            return true;
          }
          
          // For admin role: show only users they created AND are not admins/super_admins
          if (currentUserData.role === 'admin') {
            // First check if the user is an admin or super_admin - if so, filter them out
            if (user.role === 'admin' || user.role === 'super_admin') {
              console.log(`FILTERING OUT: User ${user.username} is an admin/super_admin`);
              return false;
            }
            
            // Convert both IDs to strings for comparison
            const currentAdminId = String(currentUserData.id);
            const userCreatedBy = String(user.created_by);
            
            console.log(`Comparing: User ${user.username} (${user.id}) created_by=${userCreatedBy}, currentUserID=${currentAdminId}`);
            
            // Check if this user was created by the current admin
            if (userCreatedBy === currentAdminId) {
              console.log(`KEEPING: User ${user.username} was created by current admin`);
              return true;
            }
            
            console.log(`FILTERING OUT: User ${user.username} was not created by current admin`);
            return false;
          }
          
          // Default: filter out all other users
          console.log(`FILTERING OUT: User ${user.id} - not matching any criteria`);
          return false;
        });
        
        console.log("AFTER FRONTEND FILTERING - Users:", data.map((u: { id: any, username: any, role: string }) => 
          `${u.username} (${u.id}, ${u.role})`));
        
        // After fetching users, map last_login to lastLogin for each user
        data = data.map((user: any) => ({
          ...user,
          lastLogin: user.last_login || null,
        }));
        setUsers(data);
      } catch (error) {
        console.error("Error fetching users:", error);
        toast("Error", {
          description: error instanceof Error ? error.message : "Failed to load users",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [toast]);

  // Available permissions
  const availablePermissions: Permission[] = [
    { id: "menu_view", name: "View Menu", description: "Can view menu items" },
    { id: "menu_edit", name: "Edit Menu", description: "Can edit menu items" },
    { id: "orders_view", name: "View Orders", description: "Can view customer orders" },
    { id: "orders_manage", name: "Manage Orders", description: "Can update order status" },
    { id: "tables_view", name: "View Tables", description: "Can view table status" },
    { id: "tables_manage", name: "Manage Tables", description: "Can update table status" },
    { id: "qr_generate", name: "Generate QR Codes", description: "Can generate QR codes" },
    { id: "payments_view", name: "View Payments", description: "Can view payment information" },
    { id: "customers_view", name: "View Customers", description: "Can view customer information" },
    // { id: "settings_view", name: "View Settings", description: "Can view system settings" },
    // { id: "settings_edit", name: "Edit Settings", description: "Can modify system settings" },
    { id: "users_view", name: "View Users", description: "Can view system users" },
    { id: "users_manage", name: "Manage Users", description: "Can add/edit system users" },
    { id: "inventory_view", name: "View Inventory", description: "Can view inventory items and stock levels" },
    { id: "inventory_edit", name: "Edit Inventory", description: "Can create, edit and delete inventory items" },
    { id: "inventory_manage", name: "Manage Inventory", description: "Can manage stock in/out, suppliers, and categories" },
    { id: "inventory_alerts", name: "Inventory Alerts", description: "Can view and manage inventory alerts" },
  ]
  
  // Define default permissions for each role
  const defaultRolePermissions = {
    super_admin: availablePermissions.reduce((acc, permission) => ({ ...acc, [permission.id]: true }), {}),
    admin: {
      menu_view: true,
      menu_edit: true,
      orders_view: true,
      orders_manage: true,
      tables_view: true,
      tables_manage: true,
      qr_generate: true,
      payments_view: true,
      customers_view: true,
      // settings_view: true,
      users_view: true,
    },
    menu_manager: {
      menu_view: true,
      menu_edit: true,
      tables_view: true,
      qr_generate: true,
    },
    order_manager: {
      orders_view: true,
      orders_manage: true,
      tables_view: true,
      tables_manage: true,
      payments_view: true,
    },
    customer_support: {
      customers_view: true,
      orders_view: true,
      menu_view: true,
    },
    account_manager: {
      menu_view: true,
      customers_view: true,
      account_view: true,
      account_manage: true,
    },
    qr_code_manager: {
      menu_view: true,
      qr_code_view: true,
      qr_code_manage: true,
      qr_generate: true,
    },
    inventory_manager: {
      inventory_view: true,
      inventory_edit: true,
      inventory_manage: true,
      inventory_alerts: true,
    }
  }

  // Users data is already declared at the top level of the component

  // New user form state
  const [newUser, setNewUser] = useState({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    role: "menu_manager" as UserRole,
    password: "",
    confirmPassword: "",
    permissions: {} as Record<string, boolean>,
    is_employee: true,
    is_staff: true,
  })

  // Filter users based on search query and active tab
  const filteredUsers = users.filter(
    (user) =>
      (activeTab === "all" || user.status === activeTab) &&
      ((user.first_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
        (user.last_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
        (user.username?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
        (user.email?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
        (user.role?.toLowerCase() || "").includes(searchQuery.toLowerCase())),
  )

  // Handle adding a new user
  const handleAddUser = async () => {
    // Username validation: no spaces allowed
    if (/\s/.test(newUser.username)) {
      toast("Invalid Username", {
        description: "Username cannot contain spaces."
      });
      return
    }

    // Email validation: simple regex
    if (!/^\S+@\S+\.\S+$/.test(newUser.email)) {
      toast("Invalid Email", {
        description: "Please enter a valid email address."
      });
      return;
    }

    // Warn for common email typos
    const commonTypos = ["gmaik.com", "gamil.com", "gmial.com"];
    if (commonTypos.some(typo => newUser.email.endsWith(typo))) {
      toast("Possible Email Typo", {
        description: "Did you mean gmail.com?",
      });
      return;
    }

    // Password validation: no spaces allowed
    if (/\s/.test(newUser.password)) {
      toast("Invalid Password", {
        description: "Password cannot contain spaces."
      });
      return
    }

    if (newUser.password !== newUser.confirmPassword) {
      toast("Error", {
        description: "Passwords do not match"
      });
      return
    }
    
    // Ensure role-based default permissions are applied if no custom permissions set
    const hasCustomPermissions = Object.keys(newUser.permissions).length > 0;
    const permissionsToUse = hasCustomPermissions 
      ? newUser.permissions 
      : defaultRolePermissions[newUser.role] || {};
    
    // Count permissions for notification
    const permissionCount = Object.values(permissionsToUse).filter(Boolean).length;

    // --- Set is_employee based on role ---
    let is_employee = true;
    if (newUser.role === "admin" || newUser.role === "super_admin") {
      is_employee = false;
    }
    // --- END ---

    try {
      let responseData;
      const response = await fetch(`${getApiUrl()}/api/user_role/users/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("adminAccessToken")}`,
          "X-CSRFToken": getCSRFToken() || "",
        },
        credentials: 'include',
        body: JSON.stringify({
          username: newUser.username,
          first_name: newUser.first_name,
          last_name: newUser.last_name,
          email: newUser.email,
          password: newUser.password,
          confirm_password: newUser.confirmPassword,
          role: newUser.role,
          status: "active",
          permissions: permissionsToUse,
          is_employee,
          is_staff: newUser.is_staff,
        }),
      });

      responseData = await response.json();

      if (!response.ok) {
        // Show all backend error messages in a toast
        let messages = "";
        if (typeof responseData === "string") {
          messages = responseData;
        } else if (typeof responseData === "object" && responseData !== null) {
          messages = Object.values(responseData).flat().join(" ");
        }
        toast("Error", { description: messages || "Failed to create user" });
        return;
      }

      // Get current user data
      const currentUserDataStr = localStorage.getItem("currentUserData");
      let currentUserId = null;
      
      if (currentUserDataStr) {
        try {
          const currentUserData = JSON.parse(currentUserDataStr);
          currentUserId = currentUserData.id;
          console.log("Current admin ID:", currentUserId);
        } catch (err) {
          console.error("Error parsing currentUserData:", err);
        }
      }
      
      // Make sure the created_by field is properly set
      if (!responseData.created_by && currentUserId) {
        // We need to update the user in the backend to ensure created_by is properly set
        try {
          console.log("Updating created_by on backend for user:", responseData.id);
          const updateResponse = await fetch(`${getApiUrl()}/api/user_role/users/${responseData.id}/`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${localStorage.getItem("adminAccessToken")}`,
              "X-CSRFToken": getCSRFToken() || "",
            },
            credentials: 'include',
            body: JSON.stringify({
              created_by: currentUserId
            }),
          });
          
          if (updateResponse.ok) {
            console.log("Successfully updated created_by field on backend");
          } else {
            console.error("Failed to update created_by field on backend");
          }
        } catch (err) {
          console.error("Error updating created_by:", err);
        }
      }
      
      // Create the user object with proper created_by field for local state
      const userWithCreator = {
        ...responseData,
        created_by: currentUserId,
      };
      
      console.log("User to be added to state:", userWithCreator);
      
      // Add the new user directly to the users array
      setUsers(prevUsers => {
        console.log("Previous users:", prevUsers);
        console.log("Adding new user with created_by:", userWithCreator.created_by);
        const newUsers = [...prevUsers, userWithCreator];
        console.log("Updated users array:", newUsers.map(u => `${u.username} (created_by: ${u.created_by})`))
        return newUsers;
      });
      
      toast("Success", {
        description: `User ${newUser.username} created successfully with ${permissionCount} permission${permissionCount !== 1 ? 's' : ''}`,
      });
      
      setIsAddUserDialogOpen(false);

      // Reset form
      setNewUser({
        username: "",
        first_name: "",
        last_name: "",
        email: "",
        role: "menu_manager",
        password: "",
        confirmPassword: "",
        permissions: {},
        is_employee: true,
        is_staff: true,
      });
      
      // No need to refresh from server as we've already added the user to the state
      // Just show a success message with more detail
      const roleDisplay = newUser.role.replace("_", " ");
      toast("User Created Successfully", {
        description: `${newUser.username} has been added as a ${roleDisplay} with ${newUser.role === "super_admin" ? "full access" : `${permissionCount} permission${permissionCount !== 1 ? "s" : ""}`}`,
      });
    } catch (error) {
      // Always show a toast for any error
      toast("Error", {
        description: error instanceof Error ? error.message : "Failed to create user",
      });
    }
  }

  // Handle updating user
  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    
    // Find the original user to compare changes
    const originalUser = users.find(u => u.id === selectedUser.id);
    if (!originalUser) return;
    
    // Check if user has permission to edit this user
    try {
      // First get current user role to verify permissions
      const token = localStorage.getItem("adminAccessToken");
      const headers = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-CSRFToken": getCSRFToken(),
      };
      
      const currentUserResponse = await fetch(`${getApiUrl()}/api/user_role/users/me/`, {
        headers: {
          ...headers,
          "X-CSRFToken": headers["X-CSRFToken"] || "",
        },
        credentials: 'include',
      });
      
      if (!currentUserResponse.ok) {
        throw new Error("Failed to verify current user permissions");
      }
      
      const currentUser = await currentUserResponse.json();
      console.log("Current user for permission check:", currentUser.username, currentUser.role);
      
      // Enhanced strict permission checking:
      // 1. Super admins can edit any user
      // 2. Regular admins can ONLY edit:
      //    a. Their own user record (self)
      //    b. Non-admin users they created (NEVER other admins)
      let canEdit = false;
      
      if (currentUser.role === 'super_admin') {
        // Super admins can edit anyone
        canEdit = true;
        console.log("Super admin editing user - full access granted");
      } else if (currentUser.role === 'admin') {
        // FIRST CHECK: Verify this is not an admin user (unless it's self)
        if (selectedUser.role === 'admin' || selectedUser.role === 'super_admin') {
          // Only allow editing self, NEVER other admins
          if (selectedUser.id === currentUser.id) {
            console.log("Admin editing their own profile - allowed");
            canEdit = true;
          } else {
            console.log("Admin attempting to edit another admin - BLOCKED");
            throw new Error("You cannot edit other admin users. This action has been logged.");
          }
        } else {
          // For non-admin users, verify they were created by this admin
          if (selectedUser.created_by === currentUser.id) {
            console.log("Admin editing non-admin user they created - allowed");
            canEdit = true;
          } else {
            console.log("Admin attempting to edit user they did not create - BLOCKED");
            throw new Error("You can only edit users you have created. This action has been logged.");
          }
        }
      }
      
      if (!canEdit) {
        console.log("Edit attempt blocked - insufficient permissions");
        throw new Error("You don't have permission to edit this user. This action has been logged.");
      }
      
      console.log("Permission check passed - proceeding with edit");
      
      // Track changes for notification
      const changes = [];
      if (originalUser.role !== selectedUser.role) {
        changes.push(`Role changed from ${originalUser.role.replace('_', ' ')} to ${selectedUser.role.replace('_', ' ')}`);
      }
      
      if (originalUser.status !== selectedUser.status) {
        changes.push(`Status changed from ${originalUser.status} to ${selectedUser.status}`);
      }
      
      // Count permission changes
      let permissionsAdded = 0;
      let permissionsRemoved = 0;
      
      // Check for added permissions
      Object.entries(selectedUser.permissions).forEach(([permId, enabled]) => {
        if (enabled && (!originalUser.permissions || !originalUser.permissions[permId])) {
          permissionsAdded++;
        }
      });
      
      // Check for removed permissions
      Object.entries(originalUser.permissions || {}).forEach(([permId, enabled]) => {
        if (enabled && (!selectedUser.permissions || !selectedUser.permissions[permId])) {
          permissionsRemoved++;
        }
      });
      
      if (permissionsAdded > 0) {
        changes.push(`${permissionsAdded} permission${permissionsAdded !== 1 ? 's' : ''} added`);
      }
      
      if (permissionsRemoved > 0) {
        changes.push(`${permissionsRemoved} permission${permissionsRemoved !== 1 ? 's' : ''} removed`);
      }

      const response = await fetch(`${getApiUrl()}/api/user_role/users/${selectedUser.id}/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("adminAccessToken")}`,
          "X-CSRFToken": getCSRFToken() || "",
        },
        credentials: 'include',
        body: JSON.stringify({
          username: selectedUser.username,
          first_name: selectedUser.first_name,
          last_name: selectedUser.last_name,
          email: selectedUser.email,
          role: selectedUser.role,
          status: selectedUser.status,
          permissions: selectedUser.permissions,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update user");
      }

      const updatedUser = await response.json();
      
      // Debug: Log response from server
      console.log('Server response - updated user:', updatedUser);
      console.log('Server response - user permissions:', updatedUser.permissions);
      
      const updatedUsers = users.map((user) => (user.id === updatedUser.id ? updatedUser : user));
      setUsers(updatedUsers);
      setIsEditUserDialogOpen(false);
      setSelectedUser(null);

      // Show detailed toast message about the changes
      toast("User Updated", {
        description: changes.length > 0 
          ? `${selectedUser.username}: ${changes.join(', ')}`
          : `User ${selectedUser.username} has been updated`,
      });
    } catch (error) {
      toast("Error", {
        description: error instanceof Error ? error.message : "Failed to update user",
      });
    }
  };

  // Handle user status change
  const handleStatusChange = (userId: string, newStatus: UserStatus) => {
    const updatedUsers = users.map((user) => (user.id === userId ? { ...user, status: newStatus } : user))

    setUsers(updatedUsers)

    const user = users.find((u) => u.id === userId)

    toast("Status Updated", {
      description: `${user?.username}'s status changed to ${newStatus}`,
    });
  }

  // Handle user deletion
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      // Check if user has permission to delete this user
      const token = localStorage.getItem("adminAccessToken");
      const headers = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-CSRFToken": getCSRFToken(),
      };
      
      const currentUserResponse = await fetch(`${getApiUrl()}/api/user_role/users/me/`, {
        headers: {
          ...headers,
          "X-CSRFToken": headers["X-CSRFToken"] || "",
        },
        credentials: 'include',
      });
      
      if (!currentUserResponse.ok) {
        throw new Error("Failed to verify current user permissions");
      }
      
      const currentUser = await currentUserResponse.json();
      
      // Check if current user is super_admin or is the creator of this user
      const canDelete = currentUser.role === 'super_admin' || 
                       (currentUser.role === 'admin' && userToDelete.created_by === currentUser.id);
      
      if (!canDelete) {
        throw new Error("You don't have permission to delete this user.");
      }

      const response = await fetch(`${getApiUrl()}/api/user_role/users/${userToDelete.id}/`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("adminAccessToken")}`,
          "X-CSRFToken": getCSRFToken() || "",
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete user");
      }

      const updatedUsers = users.filter((user) => user.id !== userToDelete.id);
      setUsers(updatedUsers);
      setIsDeleteDialogOpen(false);

      toast("User Deleted", {
        description: `${userToDelete.username} has been removed from the system`,
      });

      setUserToDelete(null);
    } catch (error) {
      toast("Error", {
        description: error instanceof Error ? error.message : "Failed to delete user",
      });
    }
  };

  // Get role badge
  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case "super_admin":
        return (
          <Badge className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600">
            <ShieldAlert className="mr-1 h-3 w-3" />
            Super Admin
          </Badge>
        )
      case "admin":
        return (
          <Badge className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">
            <Shield className="mr-1 h-3 w-3" />
            Admin
          </Badge>
        )
      case "menu_manager":
        return (
          <Badge className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600">
            Menu Manager
          </Badge>
        )
      case "order_manager":
        return (
          <Badge className="bg-accent hover:bg-accent/90 dark:bg-accent dark:hover:bg-accent/90">
            Order Manager
          </Badge>
        )
      case "customer_support":
        return (
          <Badge className="bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-500 dark:hover:bg-cyan-600">
            Customer Support
          </Badge>
        )
      case "account_manager":
        return (
          <Badge className="bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600">
            Account Manager
          </Badge>
        )
      case "qr_code_manager":
        return (
          <Badge className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600">
            QR-Code Manager
          </Badge>
        )
      case "inventory_manager":
        return (
          <Badge className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600">
            Inventory Manager
          </Badge>
        )
      default:
        return <Badge variant="outline">{role}</Badge>
    }
  }

  // Get status badge
  const getStatusBadge = (status: UserStatus) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600">
            <UserCheck className="mr-1 h-3 w-3" />
            Active
          </Badge>
        )
      case "inactive":
        return (
          <Badge className="bg-muted hover:bg-muted/90 dark:bg-muted dark:hover:bg-muted/90">
            <UserX className="mr-1 h-3 w-3" />
            Inactive
          </Badge>
        )
      case "pending":
        return (
          <Badge className="bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-500 dark:hover:bg-yellow-600">
            <UserPlus className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <RefreshCw className="h-10 w-10 text-orange-500 animate-spin mb-4" />
        <p className="text-lg font-semibold">Please wait…</p>
        <p className="text-sm text-gray-500">Loading section, this may take a few seconds.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 bg-background text-foreground px-2 sm:px-6 py-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="w-full sm:w-auto">
          <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
          <p className="text-muted-foreground">Manage your staff, roles, and permissions.</p>
        </div>
        <Button onClick={() => setIsAddUserDialogOpen(true)} className="w-full sm:w-auto">
          <UserPlus className="mr-2 h-4 w-4" /> Add User
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>View and manage all users in your system.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-muted/50 transition-colors border-border">
                      <TableCell className="font-medium">
                        {user.first_name || user.last_name ? `${user.first_name} ${user.last_name}`.trim() : user.username}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {user.role === "super_admin" ? (
                            <Badge variant="outline" className="text-xs bg-purple-100 text-purple-800 border-purple-300">
                              All Permissions (Super Admin)
                            </Badge>
                          ) : (
                            <>
                              {Object.entries(user.permissions || {}).filter(([_, hasPermission]) => hasPermission).map(([permId]) => {
                                const permission = availablePermissions.find(p => p.id === permId);
                                return permission ? (
                                  <Badge key={permId} variant="outline" className="text-xs">
                                    {permission.name}
                                  </Badge>
                                ) : null;
                              }).slice(0, 3)}
                              {Object.values(user.permissions || {}).filter(Boolean).length > 3 && (
                                <Badge variant="outline" className="text-xs bg-muted">
                                  +{Object.values(user.permissions || {}).filter(Boolean).length - 3} more
                                </Badge>
                              )}
                              {Object.values(user.permissions || {}).filter(Boolean).length === 0 && (
                                <Badge variant="outline" className="text-xs bg-red-100 text-red-800 border-red-300">
                                  No permissions
                                </Badge>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.lastLogin
                          ? new Date(user.lastLogin).toLocaleString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "numeric",
                              hour12: true,
                            })
                          : "Never"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                              <span className="sr-only">Actions for {user.username}</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-background border-border text-foreground">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={async () => {
                                // Check permission before allowing edit
                                try {
                                  const token = localStorage.getItem("adminAccessToken");
                                  const headers = {
                                    "Authorization": `Bearer ${token}`,
                                    "Content-Type": "application/json",
                                    "Accept": "application/json",
                                    "X-CSRFToken": getCSRFToken(),
                                  };
                                  
                                  const currentUserResponse = await fetch(`${getApiUrl()}/api/user_role/users/me/`, {
                                    headers: {
                                      ...headers,
                                      "X-CSRFToken": headers["X-CSRFToken"] || "",
                                    },
                                    credentials: 'include',
                                  });
                                  
                                  if (!currentUserResponse.ok) {
                                    throw new Error("Failed to verify permissions");
                                  }
                                  
                                  const currentUser = await currentUserResponse.json();
                                  
                                  // Can edit if super_admin, or admin who created this user, or user editing themselves
                                  // Debug the created_by relationship
                                  console.log('User being edited:', user.username, 'ID:', user.id);
                                  console.log('Created by:', user.created_by);
                                  console.log('Current user:', currentUser.username, 'ID:', currentUser.id);
                                  
                                  // Stricter permission checks
                                  // 1. Super admin can edit anyone
                                  // 2. Admin can only edit themselves or users they created
                                  // 3. Explicitly prevent editing other admins or users created by other admins
                                  let canEdit = false;
                                  
                                  if (currentUser.role === 'super_admin') {
                                    canEdit = true;
                                    console.log('Super admin permission granted');
                                  } else if (currentUser.role === 'admin') {
                                    // Admin can edit themselves
                                    if (user.id === currentUser.id) {
                                      canEdit = true;
                                      console.log('Admin editing their own profile');
                                    }
                                    // Admin can edit users they created
                                    else if (user.created_by && user.created_by === currentUser.id) {
                                      canEdit = true;
                                      console.log('Admin editing user they created');
                                    }
                                    // Explicitly deny editing other admins
                                    else if (user.role === 'admin') {
                                      canEdit = false;
                                      console.log('Admin DENIED permission to edit another admin');
                                      toast("Access Denied", {
                                        description: "You cannot view or edit other admin users.",
                                      });
                                      return;
                                    }
                                    // Deny editing users created by other admins
                                    else if (user.created_by && user.created_by !== currentUser.id) {
                                      canEdit = false;
                                      console.log('Admin DENIED permission to edit user created by another admin');
                                      toast("Access Denied", {
                                        description: "You can only view or edit users you have created.",
                                      });
                                      return;
                                    }
                                  }
                                  
                                  if (!canEdit) {
                                    toast("Permission Denied", {
                                      description: "You don't have permission to edit this user",
                                    });
                                    return;
                                  }
                                  
                                  setSelectedUser(user);
                                  setIsEditUserDialogOpen(true);
                                } catch (error) {
                                  toast("Error", {
                                    description: error instanceof Error ? error.message : "Permission check failed",
                                  });
                                }
                              }}
                              className="hover:bg-muted"
                            >
                              Edit User
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-border" />
                            {user.status !== "active" && (
                              <DropdownMenuItem onClick={() => handleStatusChange(user.id, "active")} className="hover:bg-muted">
                                Activate User
                              </DropdownMenuItem>
                            )}
                            {user.status !== "inactive" && (
                              <DropdownMenuItem onClick={() => handleStatusChange(user.id, "inactive")} className="hover:bg-muted">
                                Deactivate User
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator className="bg-border" />
                            <DropdownMenuItem
                              className="text-destructive hover:bg-destructive/10"
                              onClick={async () => {
                                // Check permission before allowing delete
                                try {
                                  const token = localStorage.getItem("adminAccessToken");
                                  const headers = {
                                    "Authorization": `Bearer ${token}`,
                                    "Content-Type": "application/json",
                                    "Accept": "application/json",
                                    "X-CSRFToken": getCSRFToken(),
                                  };
                                  
                                  const currentUserResponse = await fetch(`${getApiUrl()}/api/user_role/users/me/`, {
                                    headers: {
                                      ...headers,
                                      "X-CSRFToken": headers["X-CSRFToken"] || "",
                                    },
                                    credentials: 'include',
                                  });
                                  
                                  if (!currentUserResponse.ok) {
                                    throw new Error("Failed to verify permissions");
                                  }
                                  
                                  const currentUser = await currentUserResponse.json();
                                  
                                  // Can delete if super_admin or admin who created this user
                                  const canDelete = currentUser.role === 'super_admin' || 
                                                   (currentUser.role === 'admin' && user.created_by === currentUser.id);
                                  
                                  if (!canDelete) {
                                    toast("Permission Denied", {
                                      description: "You don't have permission to delete this user",
                                    });
                                    return;
                                  }
                                  
                                  setUserToDelete(user);
                                  setIsDeleteDialogOpen(true);
                                } catch (error) {
                                  toast("Error", {
                                    description: error instanceof Error ? error.message : "Permission check failed",
                                  });
                                }
                              }}
                            >
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
        <DialogContent className="w-full max-w-full sm:max-w-[700px] max-h-[80vh] overflow-y-auto bg-background border-border text-foreground p-2 sm:p-6">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Create a new user with specific roles and permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-foreground">Username</Label>
                <Input
                  id="username"
                  placeholder="johndoe"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  className="border-input bg-background text-foreground placeholder-muted-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="border-input bg-background text-foreground placeholder-muted-foreground"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name" className="text-foreground">First Name</Label>
                <Input
                  id="first_name"
                  placeholder="John"
                  value={newUser.first_name}
                  onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                  className="border-input bg-background text-foreground placeholder-muted-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name" className="text-foreground">Last Name</Label>
                <Input
                  id="last_name"
                  placeholder="Doe"
                  value={newUser.last_name}
                  onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                  className="border-input bg-background text-foreground placeholder-muted-foreground"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Password</Label>
              <Input
                id="password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="border-input bg-background text-foreground placeholder-muted-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-foreground">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={newUser.confirmPassword}
                onChange={(e) => setNewUser({ ...newUser, confirmPassword: e.target.value })}
                className="border-input bg-background text-foreground placeholder-muted-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role" className="text-foreground">Role</Label>
              <Select
                value={newUser.role}
                onValueChange={(value) => {
                  const role = value as UserRole;
                  // Apply default permissions for the selected role
                  const defaultPerms = defaultRolePermissions[role] || {};
                  setNewUser({ 
                    ...newUser, 
                    role, 
                    permissions: {...defaultPerms} 
                  });
                  toast("Role Updated", {
                    description: `Default permissions for ${role.replace('_', ' ')} have been applied`,
                  });
                }}
              >
                <SelectTrigger className="border-input bg-background text-foreground">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border text-foreground">
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="menu_manager">Menu Manager</SelectItem>
                  <SelectItem value="order_manager">Order Manager</SelectItem>
                  <SelectItem value="customer_support">Customer Support</SelectItem>
                  <SelectItem value="account_manager">Account Manager</SelectItem>
                  <SelectItem value="qr_code_manager">QR-Code Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="is_employee" className="text-sm font-medium text-foreground">
                    Employee Status
                  </Label>
                  <p className="text-xs text-muted-foreground">Mark this user as an employee.</p>
                </div>
                <Switch
                  id="is_employee"
                  checked={newUser.is_employee}
                  onCheckedChange={(checked) => setNewUser({ ...newUser, is_employee: checked })}
                />
              </div>
              <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="is_staff" className="text-sm font-medium text-foreground">
                    Staff Access
                  </Label>
                  <p className="text-xs text-muted-foreground">Allow this user to access the admin panel.</p>
                </div>
                <Switch
                  id="is_staff"
                  checked={newUser.is_staff}
                  onCheckedChange={(checked) => setNewUser({ ...newUser, is_staff: checked })}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-foreground text-lg font-semibold">Permissions</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-normal text-primary border-primary mr-2">
                    Role-based defaults will be applied
                  </Badge>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      // Select all permissions
                      const allPerms: Record<string, boolean> = {};
                      availablePermissions.forEach(p => {
                        allPerms[String(p.id)] = true; // Ensure p.id is treated as a string key
                      });
                      setNewUser({
                        ...newUser,
                        permissions: allPerms
                      });
                    }}
                  >
                    Select All
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      // Clear all permissions
                      setNewUser({
                        ...newUser,
                        permissions: {}
                      });
                    }}
                  >
                    Clear All
                  </Button>
                </div>
              </div>
              
              <Card className="bg-background border-border">
                <CardHeader className="pb-1">
                  <CardTitle className="text-md">Role-based permissions</CardTitle>
                  <CardDescription>
                    The user inherits certain permissions based on their role. You can customize additional permissions below.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-2 sm:p-4 max-h-[400px] overflow-y-auto overflow-x-auto">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-3 border-r pr-4">
                      <div className="font-medium text-sm mb-2">Menu</div>
                      {availablePermissions
                        .filter(p => p.id.startsWith('menu_'))
                        .map((permission) => (
                        <div key={permission.id} className="flex items-center justify-between space-x-2">
                          <div className="space-y-0.5">
                            <Label htmlFor={`permission-${permission.id}`} className="text-sm font-medium text-foreground">
                              {permission.name}
                            </Label>
                            <p className="text-xs text-muted-foreground">{permission.description}</p>
                          </div>
                          <Switch
                            id={`permission-${permission.id}`}
                            checked={newUser.permissions[permission.id] || false}
                            onCheckedChange={(checked) =>
                              setNewUser({
                                ...newUser,
                                permissions: {
                                  ...newUser.permissions,
                                  [permission.id]: checked,
                                },
                              })
                            }
                          />
                        </div>
                      ))}
                    </div>

                    <div className="space-y-3 border-r pr-4">
                      <div className="font-medium text-sm mb-2">Orders</div>
                      {availablePermissions
                        .filter(p => p.id.startsWith('orders_'))
                        .map((permission) => (
                        <div key={permission.id} className="flex items-center justify-between space-x-2">
                          <div className="space-y-0.5">
                            <Label htmlFor={`permission-${permission.id}`} className="text-sm font-medium text-foreground">
                              {permission.name}
                            </Label>
                            <p className="text-xs text-muted-foreground">{permission.description}</p>
                          </div>
                          <Switch
                            id={`permission-${permission.id}`}
                            checked={newUser.permissions[permission.id] || false}
                            onCheckedChange={(checked) =>
                              setNewUser({
                                ...newUser,
                                permissions: {
                                  ...newUser.permissions,
                                  [permission.id]: checked,
                                },
                              })
                            }
                          />
                        </div>
                      ))}
                    </div>
                    
                    <div className="space-y-3">
                      <div className="font-medium text-sm mb-2">Administration</div>
                      {availablePermissions
                        .filter(p => !p.id.startsWith('menu_') && !p.id.startsWith('orders_'))
                        .map((permission) => (
                        <div key={permission.id} className="flex items-center justify-between space-x-2">
                          <div className="space-y-0.5">
                            <Label htmlFor={`permission-${permission.id}`} className="text-sm font-medium text-foreground">
                              {permission.name}
                            </Label>
                            <p className="text-xs text-muted-foreground">{permission.description}</p>
                          </div>
                          <Switch
                            id={`permission-${permission.id}`}
                            checked={newUser.permissions[permission.id] || false}
                            onCheckedChange={(checked) =>
                              setNewUser({
                                ...newUser,
                                permissions: {
                                  ...newUser.permissions,
                                  [permission.id]: checked,
                                },
                              })
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddUserDialogOpen(false)}
              className="border-input text-foreground hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddUser}
              className="bg-primary hover:bg-primary/90 text-primary-foreground transition-colors"
            >
              Add User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto bg-background border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Update user details and permissions.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-username" className="text-foreground">Username</Label>
                  <Input
                    id="edit-username"
                    value={selectedUser.username}
                    onChange={(e) => setSelectedUser({ ...selectedUser, username: e.target.value })}
                    className="border-input bg-background text-foreground placeholder-muted-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email" className="text-foreground">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={selectedUser.email}
                    onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                    className="border-input bg-background text-foreground placeholder-muted-foreground"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-first_name" className="text-foreground">First Name</Label>
                  <Input
                    id="edit-first_name"
                    value={selectedUser.first_name}
                    onChange={(e) => setSelectedUser({ ...selectedUser, first_name: e.target.value })}
                    className="border-input bg-background text-foreground placeholder-muted-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-last_name" className="text-foreground">Last Name</Label>
                  <Input
                    id="edit-last_name"
                    value={selectedUser.last_name}
                    onChange={(e) => setSelectedUser({ ...selectedUser, last_name: e.target.value })}
                    className="border-input bg-background text-foreground placeholder-muted-foreground"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-role" className="text-foreground">Role</Label>
                  <Select
                    value={selectedUser.role}
                    onValueChange={(value) => {
                      const newRole = value as UserRole;
                      const currentRole = selectedUser.role;
                      const isDowngrade = 
                        (currentRole === 'super_admin' && newRole !== 'super_admin') ||
                        (currentRole === 'admin' && !['admin', 'super_admin'].includes(newRole));
                      
                      // If this is a role downgrade, use confirmation dialog
                      if (isDowngrade) {
                        // Set up pending role change and open confirmation dialog
                        setPendingRoleChange({
                          user: selectedUser,
                          newRole: newRole
                        });
                        setIsRoleConfirmDialogOpen(true);
                      } else {
                        // Not a downgrade, just apply the change
                        const defaultPerms = defaultRolePermissions[newRole] || {};
                        setSelectedUser({
                          ...selectedUser, 
                          role: newRole, 
                          permissions: {...defaultPerms}
                        });
                        toast("Role Updated", {
                          description: `Default permissions for ${newRole.replace('_', ' ')} have been applied`,
                        });
                      }
                    }}
                  >
                    <SelectTrigger className="border-input bg-background text-foreground">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border text-foreground">
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="menu_manager">Menu Manager</SelectItem>
                      <SelectItem value="order_manager">Order Manager</SelectItem>
                      <SelectItem value="customer_support">Customer Support</SelectItem>
                      <SelectItem value="account_manager">Account Manager</SelectItem>
                      <SelectItem value="qr_code_manager">QR-Code Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-status" className="text-foreground">Status</Label>
                  <Select
                    value={selectedUser.status}
                    onValueChange={(value) => setSelectedUser({ ...selectedUser, status: value as UserStatus })}
                  >
                    <SelectTrigger className="border-input bg-background text-foreground">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border text-foreground">
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-foreground text-lg font-semibold">Permissions</Label>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        // Select all permissions
                        const allPerms: Record<string, boolean> = {};
                        availablePermissions.forEach(p => {
                          allPerms[String(p.id)] = true; // Ensure p.id is treated as a string key
                        });
                        setSelectedUser({
                          ...selectedUser,
                          permissions: allPerms
                        });
                      }}
                    >
                      Select All
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        // Clear all permissions
                        setSelectedUser({
                          ...selectedUser,
                          permissions: {}
                        });
                      }}
                    >
                      Clear All
                    </Button>
                  </div>
                </div>
                
                <Card className="bg-background border-border">
                  <CardHeader className="pb-1">
                    <CardTitle className="text-md">Role-based permissions</CardTitle>
                    <CardDescription>
                      The user inherits certain permissions based on their role. You can customize additional permissions below.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 max-h-[400px] overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-3 border-r pr-4">
                        <div className="font-medium text-sm mb-2">Menu</div>
                        {availablePermissions
                          .filter(p => p.id.startsWith('menu_'))
                          .map((permission) => (
                          <div key={permission.id} className="flex items-center justify-between space-x-2">
                            <div className="space-y-0.5">
                              <Label htmlFor={`edit-permission-${permission.id}`} className="text-sm font-medium text-foreground">
                                {permission.name}
                              </Label>
                              <p className="text-xs text-muted-foreground">{permission.description}</p>
                            </div>
                            <Switch
                              id={`edit-permission-${permission.id}`}
                              checked={selectedUser.permissions[permission.id] || false}
                              onCheckedChange={(checked) =>
                                setSelectedUser({
                                  ...selectedUser,
                                  permissions: {
                                    ...selectedUser.permissions,
                                    [permission.id]: checked,
                                  },
                                })
                              }
                            />
                          </div>
                        ))}
                      </div>

                      <div className="space-y-3 border-r pr-4">
                        <div className="font-medium text-sm mb-2">Orders</div>
                        {availablePermissions
                          .filter(p => p.id.startsWith('orders_'))
                          .map((permission) => (
                          <div key={permission.id} className="flex items-center justify-between space-x-2">
                            <div className="space-y-0.5">
                              <Label htmlFor={`edit-permission-${permission.id}`} className="text-sm font-medium text-foreground">
                                {permission.name}
                              </Label>
                              <p className="text-xs text-muted-foreground">{permission.description}</p>
                            </div>
                            <Switch
                              id={`edit-permission-${permission.id}`}
                              checked={selectedUser.permissions[permission.id] || false}
                              onCheckedChange={(checked) =>
                                setSelectedUser({
                                  ...selectedUser,
                                  permissions: {
                                    ...selectedUser.permissions,
                                    [permission.id]: checked,
                                  },
                                })
                              }
                            />
                          </div>
                        ))}
                      </div>
                      
                      <div className="space-y-3">
                        <div className="font-medium text-sm mb-2">Administration</div>
                        {availablePermissions
                          .filter(p => !p.id.startsWith('menu_') && !p.id.startsWith('orders_'))
                          .map((permission) => (
                          <div key={permission.id} className="flex items-center justify-between space-x-2">
                            <div className="space-y-0.5">
                              <Label htmlFor={`edit-permission-${permission.id}`} className="text-sm font-medium text-foreground">
                                {permission.name}
                              </Label>
                              <p className="text-xs text-muted-foreground">{permission.description}</p>
                            </div>
                            <Switch
                              id={`edit-permission-${permission.id}`}
                              checked={selectedUser.permissions[permission.id] || false}
                              onCheckedChange={(checked) =>
                                setSelectedUser({
                                  ...selectedUser,
                                  permissions: {
                                    ...selectedUser.permissions,
                                    [permission.id]: checked,
                                  },
                                })
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditUserDialogOpen(false)}
              className="border-input text-foreground hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateUser}
              className="bg-primary hover:bg-primary/90 text-primary-foreground transition-colors"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-background border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {userToDelete && (
            <div className="py-4">
              <p className="font-medium text-foreground">
                {userToDelete.first_name || userToDelete.last_name 
                  ? `${userToDelete.first_name} ${userToDelete.last_name}`.trim() 
                  : userToDelete.username}
              </p>
              <p className="text-sm text-muted-foreground">{userToDelete.email}</p>
              <p className="text-sm text-muted-foreground">{userToDelete.role.replace("_", " ").toUpperCase()}</p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="border-input text-foreground hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground transition-colors"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Change Confirmation Dialog */}
      <Dialog open={isRoleConfirmDialogOpen} onOpenChange={setIsRoleConfirmDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-background border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Confirm Role Change</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Are you sure you want to change this user's role? This may affect their permissions.
            </DialogDescription>
          </DialogHeader>
          {pendingRoleChange && (
            <div className="py-4">
              <p className="font-medium text-foreground">
                Changing {pendingRoleChange.user.username}'s role from <span className="font-bold">{pendingRoleChange.user.role.replace('_', ' ')}</span> to <span className="font-bold">{pendingRoleChange.newRole.replace('_', ' ')}</span>
              </p>
              <p className="text-sm text-muted-foreground mt-2">This will update their default permissions based on the new role.</p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRoleConfirmDialogOpen(false)}
              className="border-input text-foreground hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (pendingRoleChange) {
                  // Apply the role change
                  setSelectedUser({
                    ...pendingRoleChange.user,
                    role: pendingRoleChange.newRole,
                    permissions: defaultRolePermissions[pendingRoleChange.newRole] || {}
                  });
                  
                  // Close dialog
                  setIsRoleConfirmDialogOpen(false);
                  setPendingRoleChange(null);
                  
                  // Notify user
                  toast("Role Updated", {
                    description: `User role changed to ${pendingRoleChange.newRole.replace('_', ' ')} with updated permissions`,
                  });
                }
              }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground transition-colors"
            >
              Confirm Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}