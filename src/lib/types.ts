export type MenuItem = {
  quantity: number
  id: number
  name: string
  description: string
  price: number
  image: string
  category: number | null
  available: boolean
  featured?: boolean
  allergens?: string[]
  nutritionalInfo?: {
    calories: number
    protein: number
    carbs: number
    fat: number
  }
  originalPrice?: number
  rating?: number
  attributes?: string[]
  isVegetarian?: boolean
  isSpicy?: boolean
  isNew?: boolean
  discount_percentage?: number | null
}

export type Discount = {
  id: number;
  name: string;
  description: string;
  discount_percentage: number;
  active: boolean;
  applicable_items: number[];
  start_date?: string | null;
  end_date?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type Table = {
  id: string
  number: number
  capacity: number
  status: "available" | "occupied" | "reserved"
  location?: string
  qrCode?: string
  reservationDetails?: {
    name: string
    time: string
    phone: string
  }
}

export type OrderStatus = "pending" | "preparing" | "ready" | "delivered" | "cancelled"

export type OrderItem = {
  menuItemId: string
  name: string
  price: number
  quantity: number
  notes?: string
}

export type Order = {
  id: string
  tableId: string
  tableNumber: number
  items: OrderItem[]
  status: OrderStatus
  total: number
  createdAt: string
  updatedAt: string
  specialInstructions?: string
  customerName?: string
  paymentStatus: "pending" | "paid"
  paymentMethod?: "cash" | "card" | "mobile"
}

export type Category = {
  id: number;
  name: string;
}

export type CategorizedMenuData = {
  category: Category;
  items: MenuItem[];
}[];

// Inventory Management Types
export type InventoryCategory = {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export type Supplier = {
  id: number;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export type InventoryItem = {
  id: number;
  name: string;
  code: string;
  unit: 'kg' | 'g' | 'l' | 'ml' | 'pcs' | 'pkg' | 'box' | 'bottle' | 'can' | 'bag';
  current_stock: number;
  minimum_threshold: number;
  purchase_price: number | null;
  supplier: number | null;
  category: number | null;
  notes: string;
  expiry_date: string | null;
  created_at: string;
  updated_at: string;
  is_low_stock: boolean;
  stock_value: number;
}

export type StockIn = {
  id: number;
  item: number;
  quantity: number;
  date: string;
  supplier: number | null;
  invoice_id: string;
  unit_price: number | null;
  remarks: string;
  created_by: number | null;
  created_at: string;
}

export type StockOut = {
  id: number;
  item: number;
  quantity: number;
  date: string;
  reason: 'used' | 'expired' | 'wasted' | 'damaged' | 'other';
  dish: number | null;
  remarks: string;
  created_by: number | null;
  created_at: string;
}

export type IngredientMapping = {
  id: number;
  dish: number;
  ingredient: number;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export type InventoryAlert = {
  item_name: string
  id: number;
  alert_type: 'low_stock' | 'expiry' | 'out_of_stock';
  item: number;
  message: string;
  is_read: boolean;
  created_at: string;
}

