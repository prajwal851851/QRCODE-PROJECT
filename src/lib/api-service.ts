import { MenuItem, Category, CategorizedMenuData, InventoryCategory, Supplier, InventoryItem, StockIn, StockOut, IngredientMapping, InventoryAlert } from "./types";
import axios from 'axios';

export interface RawMenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  rating?: number | null;
  original_price?: number | null;
  available: boolean;
  attributes: string[];
  is_new: boolean;
  category: number | null;
  discount_percentage?: number | null;
}

export interface CategorizedMenuItem {
  category: { id: number; name: string };
  items: RawMenuItem[];
}

// Validate if a URL is a valid image URL
function isValidImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    console.warn(`Invalid image URL: ${url}, defaulting to /placeholder.svg`);
    return false;
  }
  try {
    const parsedUrl = new URL(url);
    const isValid = /\.(jpg|jpeg|png|gif|svg|webp)$/i.test(parsedUrl.pathname);
    console.log(`Image URL validation for ${url}: ${isValid ? 'Valid' : 'Invalid'}`);
    return isValid;
  } catch (error) {
    console.warn(`Failed to parse image URL: ${url}, error: ${error}, defaulting to /placeholder.svg`);
    return false;
  }
}

// Helper to get the API base URL from environment variable
export function getApiUrl() {
  return process.env.NEXT_PUBLIC_API_URL || "https://qrcode-project-3.onrender.com";
}

// Fetch all menu items
export async function fetchMenuItems(): Promise<RawMenuItem[]> {
  try {
    const response = await fetch(`${getApiUrl()}/api/our_menu/`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch menu items: ${response.status}, response: ${errorText}`);
    }
    const data = await response.json();
    console.log("Fetched menu items:", data);
    return data.map((item: any) => {
      const mappedItem: RawMenuItem = {
        id: item.id,
        name: item.name || "Unknown Item",
        description: item.description || "",
        price: parseFloat(item.price) || 0,
        image: isValidImageUrl(item.image) ? item.image : "/placeholder.svg",
        rating: item.rating || null,
        original_price: item.original_price ? parseFloat(item.original_price) : null,
        available: item.available !== undefined ? item.available : true,
        attributes: item.attributes || [],
        is_new: item.is_new || false,
        category: item.category || null,
        discount_percentage: item.discount_percentage || null,
      };
      if (item.id === 8) {
        console.log(`Mapped item chickenchicken:`, mappedItem);
      }
      return mappedItem;
    });
  } catch (error) {
    console.error("Error fetching menu items:", error);
    throw error;
  }
}

// Fetch special menu items
export async function fetchSpecials(): Promise<RawMenuItem[]> {
  try {
    const response = await fetch(`${getApiUrl()}/api/our_menu/`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch specials: ${response.status}, response: ${errorText}`);
    }
    const data = await response.json();
    console.log("Fetched specials:", data);
    return data
      .filter((item: any) => item.is_new)
      .map((item: any) => {
        const mappedItem: RawMenuItem = {
          id: item.id,
          name: item.name || "Unknown Item",
          description: item.description || "",
          price: parseFloat(item.price) || 0,
          image: isValidImageUrl(item.image) ? item.image : "/placeholder.svg",
          rating: item.rating || null,
          original_price: item.original_price ? parseFloat(item.original_price) : null,
          available: item.available !== undefined ? item.available : true,
          attributes: item.attributes || [],
          is_new: item.is_new || false,
          category: item.category || null,
          discount_percentage: item.discount_percentage || null,
        };
        if (item.id === 8) {
          console.log(`Mapped special chickenchicken:`, mappedItem);
        }
        return mappedItem;
      });
  } catch (error) {
    console.error("Error fetching specials:", error);
    throw error;
  }
}

// Fetch all categories
export async function fetchCategories(userId?: number | string): Promise<Category[]> {
  if (!userId) {
    throw new Error('User ID is required to fetch categories.');
  }
  try {
    const response = await fetch(`${getApiUrl()}/api/categories/public/?user_id=${userId}`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch categories: ${response.status}, response: ${errorText}`);
    }
    const data = await response.json();
    console.log("Fetched categories:", data);
    return data.map((cat: any) => ({
      id: cat.id,
      name: cat.name || "Unknown Category",
    }));
  } catch (error) {
    console.error("Error fetching categories:", error);
    throw error;
  }
}

const API_BASE_URL = `${getApiUrl()}/api/`;
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Add request interceptor to include auth token
apiClient.interceptors.request.use(
  (config) => {
    // Prefer employee token if present, fallback to admin
    const access = localStorage.getItem('employeeAccessToken') || localStorage.getItem('adminAccessToken');
    if (access) {
      config.headers.Authorization = `Bearer ${access}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const newAccess = await refreshToken();
        if (newAccess) {
          originalRequest.headers.Authorization = `Bearer ${newAccess}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        logout();
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Fetch all tables from the API
export const getTables = async () => {
  try {
    const response = await apiClient.get('tables/');
    return response.data; // Ensure the data includes qr_code_url for each table
  } catch (error) {
    console.error('Error fetching tables:', error);
    throw error;
  }
};

// Fetch a specific table by ID for QR code generation or details
export const getTableById = async (id: string) => {
  try {
    const response = await apiClient.get(`tables/${id}/`);
    return response.data;  // Ensure the table data includes the QR code URL
  } catch (error) {
    console.error(`Error fetching table with ID ${id}:`, error);
    throw error;
  }
};

// Create an order
export const createOrder = async (orderData: any) => {
  try {
    const response = await apiClient.post('orders/', orderData);
    return response.data;
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
};

// Check if order exists by transaction_uuid
export const checkOrderExists = async (transactionUuid: string) => {
  try {
    const cleanedUuid = cleanTransactionUuid(transactionUuid);
    const response = await apiClient.get(`orders/?transaction_uuid=${cleanedUuid}`);
    return response.data.length > 0 ? response.data[0] : null;
  } catch (error) {
    console.error('Error checking order existence:', error);
    return null;
  }
};

// Clean transaction_uuid by extracting just the UUID part from eSewa responses
const cleanTransactionUuid = (transactionUuid: string): string => {
  if (!transactionUuid) return transactionUuid;
  
  // If it contains a question mark, extract the UUID part before it
  if (transactionUuid.includes('?')) {
    return transactionUuid.split('?')[0];
  }
  
  return transactionUuid;
};

// Create order with duplicate check
export const createOrderWithCheck = async (orderData: any) => {
  try {
    console.log('createOrderWithCheck called with data:', orderData);
    
    // Clean the transaction_uuid if present
    if (orderData.transaction_uuid) {
      orderData.transaction_uuid = cleanTransactionUuid(orderData.transaction_uuid);
      console.log('Cleaned transaction_uuid:', orderData.transaction_uuid);
    }
    
    // If transaction_uuid is provided, check for existing order first
    if (orderData.transaction_uuid) {
      console.log('Checking for existing order with transaction_uuid:', orderData.transaction_uuid);
      const existingOrder = await checkOrderExists(orderData.transaction_uuid);
      if (existingOrder) {
        console.log('Order already exists with this transaction_uuid:', existingOrder);
        return existingOrder;
      }
    }
    
    // Create new order if no existing order found
    console.log('Creating new order with data:', orderData);
    const response = await apiClient.post('orders/', orderData);
    console.log('Order created successfully:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Error creating order with check:', error);
    if (error.response) {
      console.error('Error response data:', error.response.data);
      console.error('Error response status:', error.response.status);
    }
    throw error;
  }
};

// Fetch all orders
export const getOrders = async () => {
  try {
    const response = await apiClient.get('orders/');
    return response.data;
  } catch (error) {
    console.error('Error fetching orders:', error);
    throw error;
  }
};

// Redirect to customer-facing menu page when clicking on a QR code (frontend routing example)
export const redirectToCustomerMenu = (tableId: string) => {
  window.location.href = `/menu/${tableId}`;
};

// Fetch categorized menu items
export async function fetchCategorizedMenuItems(): Promise<CategorizedMenuData> {
  try {
    const response = await fetch(`${getApiUrl()}/api/menu/categorized/`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch categorized menu items: ${response.status}, response: ${errorText}`);
    }
    const data = await response.json();
    console.log("Fetched categorized menu items (raw data):", data);
    // Assuming the backend returns an array of objects with 'category' and 'items'
    return data.map((categoryData: any) => ({
      category: { id: categoryData.category.id, name: categoryData.category.name || "Unknown Category" },
      items: categoryData.items.map((item: any) => {
        console.log('Mapping item in fetchCategorizedMenuItems:', item.name, ', discount_percentage:', item.discount_percentage);
        return {
          id: item.id,
          name: item.name || "Unknown Item",
          description: item.description || "",
          price: parseFloat(item.price) || 0,
          image: isValidImageUrl(item.image) ? item.image : "/placeholder.svg",
          rating: item.rating || null,
          original_price: item.original_price ? parseFloat(item.original_price) : null,
          available: item.available !== undefined ? item.available : true,
          attributes: item.attributes || [],
          is_new: item.is_new || false,
          category: item.category || null,
          discount_percentage: item.discount_percentage || null,
        };
      })
    }));
  } catch (error) {
    console.error("Error fetching categorized menu items:", error);
    throw error;
  }
}

// JWT Auth helpers
export function logout() {
  localStorage.removeItem('adminAccessToken');
  localStorage.removeItem('adminRefreshToken');
  localStorage.removeItem('adminUserData');
  localStorage.removeItem('employeeAccessToken');
  localStorage.removeItem('employeeRefreshToken');
  localStorage.removeItem('employeeUserData');
  localStorage.setItem('showLogoutSpinner', 'true');
  
  // Dispatch custom event to notify components about user data change
  window.dispatchEvent(new Event('userDataChanged'));
  
  window.location.href = '/admin/login';
}

// Enhanced logout function with toast notification
export function logoutWithToast() {
  // Get user name for personalized message
  const userData = JSON.parse(localStorage.getItem("adminUserData") || "{}")
  const userName = userData.first_name || userData.username || "Admin"

  // Clear all admin data
  localStorage.removeItem('adminAccessToken');
  localStorage.removeItem('adminRefreshToken');
  localStorage.removeItem('adminUserData');
  localStorage.removeItem('employeeAccessToken');
  localStorage.removeItem('employeeRefreshToken');
  localStorage.removeItem('employeeUserData');
  localStorage.removeItem('adminRememberMe');
  localStorage.setItem('showLogoutSpinner', 'true');

  // Show personalized toast notification (this will be handled by the calling component)
  // The toast should be called before this function
  
  // Dispatch custom event to notify components about user data change
  window.dispatchEvent(new Event('userDataChanged'));
  
  // Redirect to login page
  window.location.href = '/admin/login';
}

export async function refreshToken() {
  const refresh = localStorage.getItem('adminRefreshToken');
  if (!refresh) {
    logout();
    return null;
  }

  try {
    const response = await fetch(`${getApiUrl()}/api/authentaction/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('adminAccessToken', data.access);
      if (data.refresh) {
        localStorage.setItem('adminRefreshToken', data.refresh);
      }
      return data.access;
    } else {
      const errorData = await response.json();
      if (errorData.code === 'token_not_valid' || response.status === 401) {
        logout();
      }
      return null;
    }
  } catch (error) {
    console.error('Token refresh error:', error);
    logout();
    return null;
  }
}

export async function fetchWithAuth(url: string, options: any = {}) {
  // Prefer employee token if present, fallback to admin
  let access = localStorage.getItem('employeeAccessToken') || localStorage.getItem('adminAccessToken');
  if (!access) {
    logout();
    return new Response(null, { status: 401 });
  }

  options.headers = {
    ...(options.headers || {}),
    'Authorization': `Bearer ${access}`,
    'Content-Type': 'application/json',
  };

  let response = await fetch(url, options);

  // If unauthorized, try to refresh token
  if (response.status === 401) {
    const newAccess = await refreshToken();
    if (newAccess) {
      options.headers['Authorization'] = `Bearer ${newAccess}`;
      response = await fetch(url, options);
    }
  }

  // If still unauthorized after refresh, logout
  if (response.status === 401) {
    logout();
  }

  return response;
}

// Inventory Management API Functions
export const getInventoryCategories = async (): Promise<InventoryCategory[]> => {
  try {
    const response = await apiClient.get('inventory/categories/');
    return response.data;
  } catch (error) {
    console.error('Error fetching inventory categories:', error);
    throw error;
  }
};

export const createInventoryCategory = async (categoryData: Partial<InventoryCategory>): Promise<InventoryCategory> => {
  try {
    const response = await apiClient.post('inventory/categories/', categoryData);
    return response.data;
  } catch (error) {
    console.error('Error creating inventory category:', error);
    throw error;
  }
};

export const updateInventoryCategory = async (id: number, categoryData: Partial<InventoryCategory>): Promise<InventoryCategory> => {
  try {
    const response = await apiClient.put(`inventory/categories/${id}/`, categoryData);
    return response.data;
  } catch (error) {
    console.error('Error updating inventory category:', error);
    throw error;
  }
};

export const deleteInventoryCategory = async (id: number): Promise<void> => {
  try {
    await apiClient.delete(`inventory/categories/${id}/`);
  } catch (error) {
    console.error('Error deleting inventory category:', error);
    throw error;
  }
};

export const getSuppliers = async (): Promise<Supplier[]> => {
  try {
    const response = await apiClient.get('inventory/suppliers/');
    return response.data;
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    throw error;
  }
};

export const createSupplier = async (supplierData: Partial<Supplier>): Promise<Supplier> => {
  try {
    const response = await apiClient.post('inventory/suppliers/', supplierData);
    return response.data;
  } catch (error) {
    console.error('Error creating supplier:', error);
    throw error;
  }
};

export const updateSupplier = async (id: number, supplierData: Partial<Supplier>): Promise<Supplier> => {
  try {
    const response = await apiClient.put(`inventory/suppliers/${id}/`, supplierData);
    return response.data;
  } catch (error) {
    console.error('Error updating supplier:', error);
    throw error;
  }
};

export const deleteSupplier = async (id: number): Promise<void> => {
  try {
    await apiClient.delete(`inventory/suppliers/${id}/`);
  } catch (error) {
    console.error('Error deleting supplier:', error);
    throw error;
  }
};

export const getInventoryItems = async (): Promise<InventoryItem[]> => {
  try {
    const response = await apiClient.get('inventory/items/');
    return response.data;
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    throw error;
  }
};

export const createInventoryItem = async (itemData: Partial<InventoryItem>): Promise<InventoryItem> => {
  try {
    const response = await apiClient.post('inventory/items/', itemData);
    return response.data;
  } catch (error) {
    console.error('Error creating inventory item:', error);
    throw error;
  }
};

export const updateInventoryItem = async (id: number, itemData: Partial<InventoryItem>): Promise<InventoryItem> => {
  try {
    const response = await apiClient.put(`inventory/items/${id}/`, itemData);
    return response.data;
  } catch (error) {
    console.error('Error updating inventory item:', error);
    throw error;
  }
};

export const deleteInventoryItem = async (id: number): Promise<void> => {
  try {
    await apiClient.delete(`inventory/items/${id}/`);
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    throw error;
  }
};

export const getStockIns = async (): Promise<StockIn[]> => {
  try {
    const response = await apiClient.get('inventory/stock-ins/');
    return response.data;
  } catch (error) {
    console.error('Error fetching stock ins:', error);
    throw error;
  }
};

export const createStockIn = async (stockInData: Partial<StockIn>): Promise<StockIn> => {
  try {
    const response = await apiClient.post('inventory/stock-ins/', stockInData);
    return response.data;
  } catch (error) {
    console.error('Error creating stock in:', error);
    throw error;
  }
};

export const getStockOuts = async (): Promise<StockOut[]> => {
  try {
    const response = await apiClient.get('inventory/stock-outs/');
    return response.data;
  } catch (error) {
    console.error('Error fetching stock outs:', error);
    throw error;
  }
};

export const createStockOut = async (stockOutData: Partial<StockOut>): Promise<StockOut> => {
  try {
    const response = await apiClient.post('inventory/stock-outs/', stockOutData);
    return response.data;
  } catch (error) {
    console.error('Error creating stock out:', error);
    throw error;
  }
};

export const getIngredientMappings = async (): Promise<IngredientMapping[]> => {
  try {
    const response = await apiClient.get('inventory/ingredient-mappings/');
    return response.data;
  } catch (error) {
    console.error('Error fetching ingredient mappings:', error);
    throw error;
  }
};

export const createIngredientMapping = async (mappingData: Partial<IngredientMapping>): Promise<IngredientMapping> => {
  try {
    const response = await apiClient.post('inventory/ingredient-mappings/', mappingData);
    return response.data;
  } catch (error) {
    console.error('Error creating ingredient mapping:', error);
    throw error;
  }
};

export const updateIngredientMapping = async (id: number, mappingData: Partial<IngredientMapping>): Promise<IngredientMapping> => {
  try {
    const response = await apiClient.put(`inventory/ingredient-mappings/${id}/`, mappingData);
    return response.data;
  } catch (error) {
    console.error('Error updating ingredient mapping:', error);
    throw error;
  }
};

export const deleteIngredientMapping = async (id: number): Promise<void> => {
  try {
    await apiClient.delete(`inventory/ingredient-mappings/${id}/`);
  } catch (error) {
    console.error('Error deleting ingredient mapping:', error);
    throw error;
  }
};

export const getInventoryAlerts = async (): Promise<InventoryAlert[]> => {
  try {
    const response = await apiClient.get('inventory/alerts/');
    return response.data;
  } catch (error) {
    console.error('Error fetching inventory alerts:', error);
    throw error;
  }
};

export const markAlertAsRead = async (id: number): Promise<InventoryAlert> => {
  try {
    const response = await apiClient.patch(`inventory/alerts/${id}/`, { is_read: true });
    return response.data;
  } catch (error) {
    console.error('Error marking alert as read:', error);
    throw error;
  }
};
