"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart, Clock, Search, Filter, X, Bell, RefreshCw, AlertCircle } from "lucide-react"
import { LanguageSelector } from "@/components/language-selector"
import { MenuHeader } from "@/components/menu-header"
import { EnhancedMenuItemCard } from "@/components/enhanced-menu-item-card"
import { DiningOptions, DINING_OPTIONS } from "@/components/dining-options"

import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { useSearchParams, useRouter } from "next/navigation"
import { TableIndicator } from "@/components/table-indicator"
import { fetchSpecials, fetchCategories, getApiUrl } from "@/lib/api-service"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { Category, CategorizedMenuData } from "@/lib/types"
import type { MenuItem } from "@/lib/types" // Ensure MenuItem is only imported once and not declared elsewhere
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckoutDialog } from "./components/CheckoutDialog"
import { CallServerButton } from "@/components/call-server-button"
import { OrderStatus } from "./components/OrderStatus"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useTheme } from "next-themes"
import Link from "next/link"
import { Moon, Sun } from "lucide-react"
import { format } from "date-fns"

export default function CustomerMenuPage() {
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [cartItems, setCartItems] = useState<(MenuItem & { quantity: number })[]>([])
  const [categorizedMenuData, setCategorizedMenuData] = useState<CategorizedMenuData>([])
  const [categoriesList, setCategoriesList] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [tableId, setTableId] = useState<number | null>(null)
  const [restaurantUserId, setRestaurantUserId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<number[]>([])
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 0])
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()
  const tableName = searchParams.get("tableId") || searchParams.get("tableUid")
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [addedItemInfo, setAddedItemInfo] = useState<{ id: number; message: string } | null>(null);
  const [selectedDiningOption, setSelectedDiningOption] = useState("dine-in");
  const [tableDisplayName, setTableDisplayName] = useState<string | null>(null)
  const [selectedItems, setSelectedItems] = useState<{ [key: string]: number }>({})
  const [orderId, setOrderId] = useState<string | null>(null)
  const [showErrorDialog, setShowErrorDialog] = useState(false)
  const [hasActiveOrder, setHasActiveOrder] = useState(false)
  const [extraCharges, setExtraCharges] = useState<{ label: string; amount: number }[]>([])
  const [activeFilters, setActiveFilters] = useState<Record<string, boolean>>({
    vegetarian: false,
    spicy: false,
    new: false,
  })
  const [tempSearchTerm, setTempSearchTerm] = useState("")
  const [tempSelectedCategories, setTempSelectedCategories] = useState<number[]>([])
  const [tempPriceRange, setTempPriceRange] = useState<[number, number]>([0, 0])
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);
  const [attributeOptions, setAttributeOptions] = useState<string[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const scrollRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const mountedRef = useRef(false)
  const isFetchingRef = useRef(false)

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const tableIdParam = searchParams.get("tableId")
    const tableUidParam = searchParams.get("tableUid")
    console.log('useEffect triggered. tableIdParam:', tableIdParam, 'tableUidParam:', tableUidParam); // DEBUG LOG
    if (tableIdParam) {
      setTableId(Number.parseInt(tableIdParam))
      setTableDisplayName(tableIdParam)
    } else if (tableUidParam) {
      // Fetch table details by UID
      fetch(`${getApiUrl()}/api/tables/?public_id=${tableUidParam}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.length > 0) {
            setTableId(data[0].id)
            setTableDisplayName(data[0].name)
            console.log('Fetched table by UID:', data[0]); // DEBUG LOG
          } else {
            setTableDisplayName(null)
            console.log('No table found for UID:', tableUidParam); // DEBUG LOG
          }
        })
        .catch((err) => { setTableDisplayName(null); console.log('Error fetching table by UID:', err); })
    }
  }, [searchParams])

  const loadMenuData = async (isManualRefresh = false) => {
    if (isFetchingRef.current) return

    try {
      isFetchingRef.current = true
      setIsRefreshing(isManualRefresh)
      setFetchError(null)

      // Get tableUid or tableId from URL
      const tableUid = searchParams.get("tableUid")
      const tableId = searchParams.get("tableId")
      console.log("Table UID from URL:", tableUid);
      console.log("Table ID from URL:", tableId);
      let url = `${getApiUrl()}/api/menu/customer/`
      if (tableUid) {
        url += `?tableUid=${tableUid}`
      } else if (tableId) {
        url += `?tableId=${tableId}`
      } else {
        setFetchError("Missing tableUid in URL. Please scan the correct QR code or use the correct link.")
        setIsLoading(false)
        return
      }
      // Fetch menu items for this table's admin
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
      const data = await res.json()
      
      // Extract restaurant user ID if available in the response
      if (data.restaurant_user_id) {
        setRestaurantUserId(Number(data.restaurant_user_id))
        console.log('Restaurant User ID set to:', data.restaurant_user_id)
      } else {
        console.warn('No restaurant_user_id found in API response:', data)
        // Set a default restaurant user ID for testing/debugging
        // Based on our database query, user ID 14 has the extra charges
        setRestaurantUserId(14)
        console.log('Setting default Restaurant User ID to: 14')
      }
      
      const items = data.items || data
      // Optionally, fetch categories for filter options
      let rawCategories: Category[] = [];
      const userIdForCategories = data.restaurant_user_id;
      if (userIdForCategories) {
        rawCategories = await fetchCategories(userIdForCategories);
      } else {
        throw new Error('Missing restaurant user ID for fetching categories.');
      }
      // Group items by category
      const categorized = rawCategories.map((cat: any) => ({
        category: cat,
        items: items.filter((item: any) => item.category === cat.id),
      })).filter(catData => catData.items.length > 0)
      
      if (mountedRef.current) {
      setCategorizedMenuData(categorized)
      setCategoriesList(rawCategories)
        setLastUpdated(new Date())
        setIsLoading(false)
        setIsRefreshing(false)
      }
    } catch (error: any) {
      console.error("Failed to load menu data:", error)
      if (mountedRef.current) {
      setFetchError(`Failed to load menu: ${error.message}. Please try again.`)
        setIsRefreshing(false)
        if (!categorizedMenuData.length) {
      setIsLoading(false)
        }
      }
    } finally {
      isFetchingRef.current = false
    }
  }

  useEffect(() => {
    mountedRef.current = true
    loadMenuData()
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Set up polling to refresh menu data every 1 minute, only when the page is visible
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const startPolling = () => {
      if (intervalId === null) {
        intervalId = setInterval(() => {
          if (mountedRef.current && !isFetchingRef.current) {
          console.log('Polling for customer menu data...');
          loadMenuData();
          }
        }, 60000); // Poll every 1 minute (same as admin sections)
      }
    };

    const stopPolling = () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        startPolling();
      }
    };

    // Start polling when the component mounts and the page is visible
    if (!document.hidden) {
      startPolling();
    }

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Clean up interval and event listener on component unmount
    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []); // Remove loadMenuData from dependencies to prevent infinite re-renders

  const addToCart = useCallback(
    (item: MenuItem, quantity = 1) => {
      console.log('addToCart called', item.name, quantity);
      const existingItem = cartItems.find((cartItem) => cartItem.id === item.id)

      // Calculate discounted price if discount exists
      const priceToUse = item.discount_percentage && item.discount_percentage > 0
        ? item.price * (1 - item.discount_percentage / 100)
        : item.price;

      if (existingItem) {
        setCartItems(
          cartItems.map((cartItem) =>
            cartItem.id === item.id ? { ...cartItem, quantity: cartItem.quantity + quantity } : cartItem
          )
        )
      } else {
        // Add item with the calculated priceToUse
        setCartItems([...cartItems, { ...item, quantity, price: priceToUse }])
      }

      // Show toast message for adding to cart (bottom right corner)
      toast(`${item.name} added to cart.`);
    },
    [cartItems]
  )

  const removeFromCart = useCallback(
    (itemId: number) => {
      const itemToRemove = cartItems.find((item) => item.id === itemId)
      if (itemToRemove) {
        setCartItems(cartItems.filter((item) => item.id !== itemId))
        toast(`${itemToRemove.name} removed from your order`)
      }
    },
    [cartItems]
  )

  const updateQuantity = useCallback(
    (itemId: number, quantity: number) => {
      if (quantity <= 0) {
        removeFromCart(itemId)
        return
      }
      setCartItems(cartItems.map((item) => (item.id === itemId ? { ...item, quantity } : item)))
    },
    [cartItems, removeFromCart]
  )

  const submitOrder = async () => {
    if (!tableId) {
      toast("Table number is required.")
      return
    }

    try {
      const orderData = {
        table_id: tableId,
        items: cartItems.map((item) => ({
          menuItemId: item.id.toString(),
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        total: totalPrice,
        status: "pending",
        payment_status: "pending",
        dining_option: selectedDiningOption,
      }

      const response = await fetch(`${getApiUrl()}/api/orders/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      })

      if (!response.ok) throw new Error("Failed to submit order")
      const order = await response.json()
      toast(`Order #${order.id} has been placed successfully.`)
      setCartItems([])
      setIsCartOpen(false)
    } catch (error) {
      console.error("Error submitting order:", error)
      toast("Failed to submit order. Please try again.")
    }
  }

  const totalItems = cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0)
  const totalPrice = Number(cartItems.reduce((sum, item) => sum + item.price * (item.quantity || 0), 0).toFixed(2))

  const toggleFilter = useCallback(
    (filter: string) => {
      setActiveFilters((prev) => {
        const newFilters = { ...prev, [filter]: !prev[filter] }
        // Find all items across all categories to check for spicy items
        const allItems = categorizedMenuData.reduce<MenuItem[]>((acc, categoryData) => acc.concat(categoryData.items), [])

        if (filter === "spicy" && newFilters.spicy) {
          const spicyItems = allItems.filter(
            (item) => item.isSpicy && item.available && !cartItems.some((cartItem) => cartItem.id === item.id)
          )
          spicyItems.forEach((item) => addToCart(item, 1))
        }
        return newFilters
      })
    },
    [categorizedMenuData, cartItems, addToCart]
  )

  const clearFilters = useCallback(() => {
    setActiveFilters({});
    setSearchTerm("");
    setSelectedCategories([]);
    setPriceRange([0, 0]);
    setTempSearchTerm("");
    setTempSelectedCategories([]);
    setTempPriceRange([0, 0]);
  }, []);

  const hasActiveFilters =
    tempSearchTerm !== "" ||
    tempSelectedCategories.length > 0 ||
    tempPriceRange[0] > 0 ||
    tempPriceRange[1] < 0

  const getFilteredItems = useCallback(
    (items: MenuItem[]) => {
      return items.filter((item) => {
        const matchesCategory =
          selectedCategories.length === 0 ||
          selectedCategories.includes(item.category);
        const matchesSearch =
          searchTerm === "" ||
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.description.toLowerCase().includes(searchTerm.toLowerCase());
        let matchesPrice = true;
        if (!(priceRange[0] === 0 && priceRange[1] === 0)) {
          matchesPrice = item.price >= priceRange[0] && item.price <= priceRange[1];
        }
        const isAvailable = item.available;
        return matchesCategory && matchesSearch && matchesPrice && isAvailable;
      });
    },
    [searchTerm, priceRange, selectedCategories]
  )

  // Flatten all items from categorized data for filtering and display
  const allMenuItems: MenuItem[] = categorizedMenuData.reduce<MenuItem[]>(
    (acc, categoryData) => acc.concat(categoryData.items),
    []
  )

  // Apply filters to the flattened list of all items
  const filteredItems = getFilteredItems(allMenuItems)

  // Separate specials and main items from the filtered list for rendering
  const filteredSpecials = filteredItems.filter(item => item.isNew)
  const mainFilteredItems = filteredItems.filter(item => !item.isNew)

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  }

  const handleOrderPlaced = () => {
    setCartItems([])
  }

  const handleQuantityChange = (itemId: string, quantity: number) => {
    if (hasActiveOrder) {
      setShowErrorDialog(true)
      return
    }
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: Math.max(0, quantity)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tableId) {
      toast({
        title: "Error",
        description: "No table ID provided",
        variant: "destructive",
      })
      return
    }

    // Check for existing orders before proceeding
    try {
      const checkResponse = await fetch(`${getApiUrl()}/api/orders/check-table/${tableId}/`)
      if (!checkResponse.ok) throw new Error("Failed to check table status")
      const checkData = await checkResponse.json()
      
      if (checkData.has_active_order) {
        setShowErrorDialog(true)
        return
      }

      // If no active order, proceed with creating new order
      const orderResponse = await fetch(`${getApiUrl()}/api/orders/create/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          table: tableId,
          items: Object.entries(selectedItems)
            .filter(([_, quantity]) => quantity > 0)
            .map(([itemId, quantity]) => ({
              item: itemId,
              quantity,
            })),
        }),
      })

      if (!orderResponse.ok) throw new Error("Failed to create order")
      const orderData = await orderResponse.json()
      setOrderId(orderData.id)
      setSelectedItems({})
    } catch (error) {
      toast("Failed to create order. Please try again.")
    }
  }

  const handleCloseErrorDialog = () => {
    setShowErrorDialog(false)
    // Redirect to home page when closing the error dialog
    router.push('/')
  }

  // Load extra charges when restaurant user ID is set
  useEffect(() => {
    if (restaurantUserId) {
      console.log('Loading extra charges for restaurant user:', restaurantUserId);
      fetch(`${getApiUrl()}/api/extra-charges/by-user/${restaurantUserId}/`)
        .then(res => {
          if (!res.ok) {
            throw new Error('Failed to fetch extra charges');
          }
          return res.json();
        })
        .then(data => {
          console.log('Extra charges data received:', data);
          if (Array.isArray(data)) {
            const formattedCharges = data.map(charge => ({
              label: charge.label,
              amount: Number(charge.amount)
            }));
            console.log('Setting extra charges:', formattedCharges);
            setExtraCharges(formattedCharges);
          }
        })
        .catch(error => {
          console.error('Error fetching extra charges:', error);
          setExtraCharges([]);
        });
    }
  }, [restaurantUserId]);

  useEffect(() => {
    const allAttrs = Array.from(new Set(
      categorizedMenuData.flatMap(catData => catData.items.flatMap(item => item.attributes || []))
    ));
    setAttributeOptions(allAttrs);
  }, [categorizedMenuData]);

  useEffect(() => {
    if (isFilterOpen) {
      setTempSearchTerm(searchTerm);
      setTempSelectedCategories(selectedCategories);
      setTempPriceRange(priceRange);
    }
  }, [isFilterOpen]);

  const handleManualRefresh = () => {
    if (!isFetchingRef.current) {
      loadMenuData(true)
    }
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="max-w-md w-full">
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Error Loading Menu</AlertTitle>
          <AlertDescription>
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Failed to load menu data</span>
              </div>
              <p className="text-xs mb-3">{fetchError}</p>
            <Button
              variant="outline"
                size="sm"
                onClick={handleManualRefresh}
                className="text-xs"
            >
                Try Again
            </Button>
          </AlertDescription>
        </Alert>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading menu...</p>
        </div>
      </div>
    )
  }

  if (!tableName) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Missing table information in the URL. Please scan a valid QR code or use the correct link.
            <Button
              variant="outline"
              className="mt-4 w-full border-primary text-primary hover:bg-primary/10"
              onClick={loadMenuData}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (orderId) {
    return <OrderStatus orderId={orderId} />
  }

  if (hasActiveOrder) {
    return (
      <div className="container mx-auto p-4">
        <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cannot Place New Order</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p>You already have an active order. Please scan the QR code on your table again to place a new order.</p>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleCloseErrorDialog}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-[#f7f7fa] dark:bg-gray-900 antialiased">
      <div className="fixed top-0 left-0 w-full z-50 bg-[#181e29] border-b border-gray-700 px-2 sm:px-4 py-3 flex items-center gap-2 sm:gap-4" style={{minHeight: '64px'}}>
        {/* Search icon-only button in header */}
          <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="ml-1 sm:ml-2"
            onClick={() => {
              setIsSearchOpen(true);
              setTimeout(() => searchInputRef.current?.focus(), 100);
            }}
            aria-label="Open search"
          >
            <Search className="h-5 w-5 text-gray-400" />
        </Button>
      </div>
        {/* Table info - simplified */}
        <span className="text-sm sm:text-base font-semibold text-gray-100 ml-2 sm:ml-4">Table <span className="font-extrabold text-orange-500">{tableDisplayName}</span></span>
        {/* Status dot replaced with theme toggle */}
        <button
          className="ml-2 sm:ml-4 p-2 rounded-full hover:bg-gray-700 transition-colors"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5 text-yellow-400" />
          ) : (
            <Moon className="h-5 w-5 text-gray-400" />
          )}
        </button>
        {/* Filter icon-only button next to theme toggle */}
            <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
              className="ml-1 sm:ml-2 rounded-full p-2 flex items-center gap-2 shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-primary/10 transition text-gray-800 dark:text-gray-100 hover:scale-105 active:scale-95 transition-transform"
                >
                  <Filter className="w-5 h-5" />
                  {hasActiveFilters && (
                    <Badge className="ml-2 px-2 py-0.5 text-xs font-semibold bg-blue-500 text-white rounded-full dark:bg-blue-600">
                      Active
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:w-3/4 dark:bg-gray-900 max-h-[90vh] overflow-y-auto" side="right">
                <SheetHeader>
                  <SheetTitle>Filter Menu</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col space-y-6 py-6">
                  <div>
                    <h4 className="mb-2 text-lg font-semibold">Category</h4>
                    <div className="flex flex-col space-y-2 max-h-40 overflow-y-auto">
                      {categoriesList.map((cat) => (
                        <div key={cat.id} className="flex items-center space-x-2">
                        <Checkbox
                            id={`category-${cat.id}`}
                            checked={tempSelectedCategories.includes(cat.id)}
                            onCheckedChange={() => {
                              setTempSelectedCategories((prev) =>
                                prev.includes(cat.id)
                                  ? prev.filter((id) => id !== cat.id)
                                  : [...prev, cat.id]
                              );
                            }}
                          />
                          <Label htmlFor={`category-${cat.id}`}>{cat.name}</Label>
                      </div>
                      ))}
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="mb-2 text-lg font-semibold">Price</h4>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        className="w-28"
                        value={tempPriceRange[0]}
                        onChange={(e) => setTempPriceRange([Number(e.target.value) || 0, tempPriceRange[1]])}
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        className="w-28"
                        value={tempPriceRange[1]}
                        onChange={(e) => setTempPriceRange([tempPriceRange[0], Number(e.target.value) || 0])}
                      />
                    </div>
                  </div>
                  <Separator />
                  {hasActiveFilters && (
                    <Button variant="outline" onClick={clearFilters} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700">
                      Clear Filters
                    </Button>
                  )}
                </div>
                <SheetFooter>
                  <SheetClose asChild>
                    <Button className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700" onClick={() => { setSearchTerm(tempSearchTerm); setSelectedCategories(tempSelectedCategories); setPriceRange(tempPriceRange); setIsFilterOpen(false); }}>Apply Filters</Button>
                  </SheetClose>
                </SheetFooter>
              </SheetContent>
            </Sheet>
        {/* Cart icon */}
        <Button variant="ghost" size="icon" className="relative hover:scale-105 active:scale-95 transition-transform ml-1 sm:ml-2" onClick={() => setIsCheckoutOpen(true)}>
          <ShoppingCart className="h-6 w-6 text-gray-100" />
          {totalItems > 0 && (
            <span className="absolute -top-2 -right-2 bg-orange-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">{totalItems > 99 ? "99+" : totalItems}</span>
          )}
          <span className="sr-only">Cart</span>
        </Button>
        {/* Last updated timestamp */}
        {lastUpdated && (
          <span className="text-xs text-gray-400 ml-1 hidden sm:inline">
            Updated: {format(lastUpdated, 'HH:mm:ss')}
          </span>
        )}
        {/* Mobile-friendly timestamp */}
        {lastUpdated && (
          <span className="text-[10px] text-gray-400 ml-0.5 sm:hidden">
            {format(lastUpdated, 'HH:mm')}
          </span>
        )}
        {/* Refresh Menu button */}
            <Button
          variant="ghost" 
          size="icon" 
          className="hover:scale-105 active:scale-95 transition-transform ml-0.5 sm:ml-1" 
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          aria-label="Refresh menu"
        >
          {isRefreshing ? (
            <div className="flex items-center gap-1">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            </div>
          ) : (
            <RefreshCw className="h-5 w-5 text-gray-100" />
          )}
            </Button>
        {/* Waiter Call button */}
        <CallServerButton tableName={tableDisplayName} />
      </div>
      
      {/* Search section that appears below header */}
      {isSearchOpen && (
        <div className="fixed top-16 left-0 w-full z-40 bg-[#232a3a] border-b border-gray-700 px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search menu items..."
              className="flex-1 bg-transparent outline-none text-gray-100 placeholder-gray-400 text-lg"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <Button variant="ghost" size="icon" onClick={() => setIsSearchOpen(false)} aria-label="Close search">
              <X className="h-5 w-5 text-gray-400" />
            </Button>
          </div>
        </div>
      )}
      
      {/* Dining Options - below header */}
      <div className="w-full bg-[#181e29] border-b border-gray-700 px-4 py-2 mt-20">
        <div className="max-w-4xl mx-auto flex justify-center">
          <DiningOptions value={selectedDiningOption} onChange={setSelectedDiningOption} />
        </div>
      </div>
      
      <main className="container mx-auto px-4 py-8 md:px-6 lg:px-8 w-full max-w-4xl pt-16">
        <CallServerButton tableName={tableName} />
        {/* Search and Filter - Improved UI */}
        <div className="mb-6 flex flex-col items-center w-full">
          <div className="flex gap-3">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="icon"
                onClick={clearFilters}
                className="text-orange-600 dark:text-orange-400"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div>
            {/* Specials Section */}
            {filteredSpecials.length > 0 && (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={containerVariants}
                className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-4 mb-6 border border-gray-200 dark:border-gray-700"
              >
                <h2 className="text-lg font-semibold mb-3 dark:text-white">Today's Specials</h2>
                <motion.div className="grid grid-cols-2 md:grid-cols-3 gap-6" variants={containerVariants}>
                  {filteredSpecials.map((item) => (
                    <motion.div key={item.id} variants={itemVariants}>
                      <EnhancedMenuItemCard
                        item={item}
                        onAddToCart={(quantity) => addToCart(item, quantity)}
                        addedItemInfo={addedItemInfo}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            )}

            {/* Main Menu Items (grouped by category) */}
            {categorizedMenuData.map((categoryData) => {
              const itemsInCategory = getFilteredItems(categoryData.items);
              if (itemsInCategory.length === 0) {
                return null;
              }
              const handleScrollRight = (catId: string | number, reverse = false) => {
                const ref = scrollRefs.current[catId];
                if (ref) {
                  ref.scrollBy({ left: reverse ? -180 : 180, behavior: 'smooth' });
                }
              };
              return (
                <motion.div
                  key={categoryData.category.id}
                  initial="hidden"
                  animate="visible"
                  variants={containerVariants}
                  className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-4 mb-6 border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center justify-between mb-3">
                    {/* Show left arrow icon if more than 2 items, now clickable */}
                    {itemsInCategory.length > 2 && (
                      <span
                        className="mr-2 bg-gradient-to-r from-white/80 dark:from-gray-900/80 to-transparent p-1 rounded-full cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 transition"
                        onClick={() => handleScrollRight(categoryData.category.id, true)}
                        title="Scroll left"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                      </span>
                    )}
                    <h2 className="text-lg font-semibold dark:text-white">{categoryData.category.name}</h2>
                    {/* Show right arrow icon if more than 2 items, now clickable */}
                    {itemsInCategory.length > 2 && (
                      <span
                        className="ml-2 bg-gradient-to-l from-white/80 dark:from-gray-900/80 to-transparent p-1 rounded-full cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 transition"
                        onClick={() => handleScrollRight(categoryData.category.id)}
                        title="Scroll right"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <div 
                      ref={(el) => {
                        if (el) scrollRefs.current[categoryData.category.id] = el;
                      }} 
                      className="flex overflow-x-auto gap-4 pb-2"
                    >
                    {itemsInCategory.map((item) => (
                        <div key={item.id} className="min-w-[150px] max-w-[200px]">
                        <EnhancedMenuItemCard
                          item={item}
                          onAddToCart={(quantity) => addToCart(item, quantity)}
                          addedItemInfo={addedItemInfo}
                        />
                        </div>
                    ))}
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {/* Handle case where no items match search/filters across all categories */}
            {filteredItems.length === 0 && (tempSearchTerm !== "" || hasActiveFilters) && (
              <p className="text-center text-gray-600 dark:text-gray-400">No items found matching your search and filters.</p>
            )}
             {/* Handle case where no items are available initially or after filtering */}
             {filteredItems.length === 0 && tempSearchTerm === "" && !hasActiveFilters && categorizedMenuData.length > 0 && (
              <p className="text-center text-gray-600 dark:text-gray-400">No menu items available in the fetched data.</p>
            )}
             {/* Handle case where no menu data was fetched (should be caught by fetchError or isLoading) */}
             {categorizedMenuData.length === 0 && !isLoading && !fetchError && (
                <p className="text-center text-gray-600 dark:text-gray-400">Menu data is not available.</p>
             )}

          </div>
        </div>
      </main>
      <CheckoutDialog
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cartItems={cartItems}
        tableName={tableName}
        onOrderPlaced={() => {
          setCartItems([])
          setIsCheckoutOpen(false)
        }}
        diningOption={selectedDiningOption}
        extraCharges={extraCharges}
      />
    </div>
  )
}