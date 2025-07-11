"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Plus, MoreHorizontal, Edit, Trash, RefreshCw, Image as ImageIcon, Tag, DollarSign, Info, Star, ListChecks, CheckCircle, PlusCircle, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { fetchWithAuth } from '@/lib/api-service'
import { ToastAction } from "@/components/ui/toast"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet"
import { Checkbox } from "@/components/ui/checkbox"
import { useLoading } from '@/contexts/LoadingContext'
import Select, { components } from 'react-select'
import type { OptionProps, SingleValueProps } from 'react-select'
import { getApiUrl } from '@/lib/api-service';
import { useRequireSubscription } from '@/hooks/useRequireSubscription';

interface MenuItem {
  id: number
  name: string
  description: string
  price: number
  image: string
  rating?: number | null
  is_new?: boolean
  originalPrice?: number | null
  attributes: string[]
  available: boolean
  category?: number | null;
  discount_percentage?: number | null;
}

interface MenuData {
  specials: MenuItem[]
  items: MenuItem[]
}

// Helper for react-select options
const toOptions = (arr: string[]) => arr.map(attr => ({ value: attr, label: attr }));
const toCategoryOptions = (arr: {id: number, name: string}[]) => arr.map(cat => ({ value: cat.id, label: cat.name }));

// Helper to detect dark mode
const isDarkMode = typeof window !== 'undefined' && (window.matchMedia('(prefers-color-scheme: dark)').matches || document.documentElement.classList.contains('dark'));

// Custom styles for react-select with explicit colors for light/dark mode
const selectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    backgroundColor: isDarkMode ? '#18181b' : '#fff',
    color: isDarkMode ? '#f4f4f5' : '#18181b',
    borderColor: state.isFocused ? (isDarkMode ? '#fbbf24' : '#ea580c') : (isDarkMode ? '#27272a' : '#e5e7eb'),
    boxShadow: state.isFocused ? `0 0 0 1px ${isDarkMode ? '#fbbf24' : '#ea580c'}` : base.boxShadow,
    '&:hover': {
      borderColor: isDarkMode ? '#fbbf24' : '#ea580c',
    },
    minHeight: '2.5rem',
  }),
  menu: (base: any) => ({
    ...base,
    backgroundColor: isDarkMode ? '#18181b' : '#fff',
    color: isDarkMode ? '#f4f4f5' : '#18181b',
    zIndex: 9999,
  }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isFocused ? (isDarkMode ? '#27272a' : '#f3f4f6') : (isDarkMode ? '#18181b' : '#fff'),
    color: isDarkMode ? '#f4f4f5' : '#18181b',
    cursor: 'pointer',
  }),
  multiValue: (base: any) => ({
    ...base,
    backgroundColor: isDarkMode ? '#27272a' : '#f3f4f6',
    color: isDarkMode ? '#f4f4f5' : '#18181b',
  }),
  singleValue: (base: any) => ({
    ...base,
    color: isDarkMode ? '#f4f4f5' : '#18181b',
  }),
  input: (base: any) => ({
    ...base,
    color: isDarkMode ? '#f4f4f5' : '#18181b',
  }),
  placeholder: (base: any) => ({
    ...base,
    color: isDarkMode ? '#a1a1aa' : '#6b7280',
  }),
};

export default function MenuPage() {
  useRequireSubscription();
  const deletedAttributesRef = useRef<Set<string>>(new Set());
  const deletedCategoriesRef = useRef<Set<number>>(new Set());
  const { setShow } = useLoading();
  useEffect(() => { setShow(false); }, [setShow]);

  const [menuData, setMenuData] = useState<MenuData>({ specials: [], items: [] })
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [currentItem, setCurrentItem] = useState<MenuItem | null>(null)
  const [newItem, setNewItem] = useState<Partial<MenuItem>>({
    name: "",
    description: "",
    price: 0,
    image: "",
    rating: 0,
    attributes: [],
    is_new: false,
    originalPrice: undefined,
    available: true,
  })
  const { toast } = useToast()
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true)
  const [categoriesError, setCategoriesError] = useState<string | null>(null)
  const [deletedItems, setDeletedItems] = useState<MenuItem[]>([])
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [isAddCategoryOpenEdit, setIsAddCategoryOpenEdit] = useState(false)
  const [newCategoryNameEdit, setNewCategoryNameEdit] = useState("")
  const [isAddingCategoryEdit, setIsAddingCategoryEdit] = useState(false)
  const [newAttribute, setNewAttribute] = useState("")
  const [attributeOptions, setAttributeOptions] = useState<string[]>([])
  const [filterText, setFilterText] = useState("")
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [tempSelectedCategories, setTempSelectedCategories] = useState<number[]>([])
  const [tempSelectedAttributes, setTempSelectedAttributes] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<number[]>([])
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([])
  const [isAddAttributeDialogOpen, setIsAddAttributeDialogOpen] = useState(false)
  const [newAttributeName, setNewAttributeName] = useState("")
  const [isAddingAttribute, setIsAddingAttribute] = useState(false)
  const [addFormErrors, setAddFormErrors] = useState<{ [key: string]: string }>({});
  const [isAddingItem, setIsAddingItem] = useState(false);

  // Persist deleted attributes and categories in localStorage
  const [deletedAttributes, setDeletedAttributes] = useState<Set<string>>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('deletedAttributes') : null;
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [deletedCategories, setDeletedCategories] = useState<Set<number>>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('deletedCategories') : null;
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const fetchMenu = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${getApiUrl()}/api/our_menu/`)
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
      const data = await res.json()
      setMenuData({
        specials: data.filter((item: MenuItem) => item.is_new),
        items: data,
      })
      setFetchError(null)
    } catch (err: any) {
      console.error("Failed to fetch menu:", err.message)
      setFetchError(`Failed to load menu: ${err.message}. Please try again.`)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMenu()
  }, [fetchMenu])

  // Set up polling to refresh menu data every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('Polling for admin menu data...');
      fetchMenu();
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval); // Clean up interval on component unmount
  }, [fetchMenu]); // Re-run effect if fetchMenu changes

  // Fetch CSRF token on mount to set CSRF cookie
  useEffect(() => {
    fetch(getApiUrl() + "/api/csrf/", {
      credentials: "include",
    }).catch((err) => console.error("Failed to fetch CSRF token:", err))
  }, [])

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsCategoriesLoading(true)
        const response = await fetchWithAuth(`${getApiUrl()}/api/categories/`)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        console.log('Categories data:', data)
        if (!Array.isArray(data)) {
          throw new Error('Categories data is not an array')
        }
        setCategories(data.filter((cat: {id: number}) => !deletedCategories.has(cat.id)))
        setCategoriesError(null)
      } catch (err: any) {
        console.error("Failed to fetch categories:", err.message)
        setCategoriesError(`Failed to load categories: ${err.message}`)
        setCategories([])
      } finally {
        setIsCategoriesLoading(false)
      }
    }

    fetchCategories()
  }, [deletedCategories])

  useEffect(() => {
    const allAttrs = Array.from(new Set(menuData.items.flatMap(item => item.attributes || [])));
    setAttributeOptions(prev => Array.from(new Set([
      ...prev,
      ...allAttrs.filter(attr => !deletedAttributes.has(attr))
    ])));
  }, [menuData.items, deletedAttributes]);

  function validateNewItem(item: Partial<MenuItem>) {
    const errors: { [key: string]: string } = {};
    if (!item.name || item.name.trim().length < 2) errors.name = "Name is required (min 2 chars).";
    if (!item.price || isNaN(Number(item.price)) || Number(item.price) <= 0) errors.price = "Price must be a positive number.";
    if (item.image && !/^https?:\/\/.+|\/[^\s]+\.(jpg|jpeg|png|svg|webp)$/i.test(item.image)) errors.image = "Image URL must be valid or start with '/'.";
    return errors;
  }

  const handleAddItem = async () => {
    const errors = validateNewItem(newItem);
    setAddFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setIsAddingItem(true);
    const itemToAdd = {
      name: newItem.name,
      description: newItem.description || "",
      price: Number(newItem.price),
      originalPrice: newItem.originalPrice ? Number(newItem.originalPrice) : null,
      image: newItem.image || "/placeholder.svg",
      image_url: newItem.image,
      rating: Number(newItem.rating) || 0,
      attributes: newItem.attributes || [],
      is_new: newItem.is_new || false,
      available: newItem.available ?? true,
      category: newItem.category,
      discount_percentage: newItem.discount_percentage ? Number(newItem.discount_percentage) : null,
    };
    try {
      const res = await fetchWithAuth(`${getApiUrl()}/api/our_menu/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemToAdd),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(`HTTP error! status: ${res.status}, message: ${JSON.stringify(errorData)}`);
      }
      const savedItem = await res.json();
      setMenuData((prev) => ({
        specials: savedItem.is_new ? [...prev.specials, savedItem] : prev.specials,
        items: [...prev.items, savedItem],
      }));
      setIsAddDialogOpen(false);
      setNewItem({
        name: "",
        description: "",
        price: 0,
        image: "/placeholder.svg",
        rating: 0,
        attributes: [],
        is_new: false,
        originalPrice: undefined,
        available: true,
        discount_percentage: null,
      });
      setAddFormErrors({});
      toast({
        title: "Item Added",
        description: `${itemToAdd.name} has been added to the menu.`,
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: `Failed to add item: ${err.message}`,
        variant: "destructive",
      });
    } finally {
      setIsAddingItem(false);
    }
  };

  useEffect(() => {
    if (!isAddDialogOpen) {
      setAddFormErrors({});
      setIsAddingItem(false);
      setNewItem({
        name: "",
        description: "",
        price: 0,
        image: "/placeholder.svg",
        rating: 0,
        attributes: [],
        is_new: false,
        originalPrice: undefined,
        available: true,
        discount_percentage: null,
      });
    }
  }, [isAddDialogOpen]);

  const handleEditItem = async () => {
    if (!currentItem || !currentItem.name || !currentItem.price) {
      toast({
        title: "Error",
        description: "Name and price are required.",
        variant: "destructive",
      })
      return
    }

    try {
      const res = await fetchWithAuth(`${getApiUrl()}/api/our_menu/${currentItem.id}/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...currentItem,
          price: Number(currentItem.price),
          rating: Number(currentItem.rating),
          originalPrice: currentItem.originalPrice ? Number(currentItem.originalPrice) : null,
          category: currentItem.category,
          discount_percentage: currentItem.discount_percentage ? Number(currentItem.discount_percentage) : null,
        }),
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(`HTTP error! status: ${res.status}, message: ${JSON.stringify(errorData)}`)
      }
      const updatedItem = await res.json()
      setMenuData((prev) => ({
        specials: updatedItem.is_new
          ? prev.specials.some((item) => item.id === updatedItem.id)
            ? prev.specials.map((item) => (item.id === updatedItem.id ? updatedItem : item))
            : [...prev.specials, updatedItem]
          : prev.specials.filter((item) => item.id !== updatedItem.id),
        items: prev.items.map((item) => (item.id === updatedItem.id ? updatedItem : item)),
      }))
      setIsEditDialogOpen(false)
      setCurrentItem(null)
      toast({
        title: "Item Updated",
        description: `${currentItem.name} has been updated.`,
      })
    } catch (err: any) {
      console.error("Failed to update item:", err.message)
      toast({
        title: "Error",
        description: `Failed to update item: ${err.message}`,
        variant: "destructive",
      })
    }
  }

  const handleDeleteItem = (item: MenuItem) => {
    // Show confirmation toast
    const { dismiss: dismissConfirm } = toast({
      title: "Delete Menu Item",
      description: `Are you sure you want to delete '${item.name}'?`,
      action: (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              dismissConfirm()
            }}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={async () => {
              dismissConfirm()
              try {
                const res = await fetchWithAuth(`${getApiUrl()}/api/our_menu/${item.id}/`, {
                  method: "DELETE",
                })
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
                setMenuData((prev) => ({
                  specials: prev.specials.filter((i) => i.id !== item.id),
                  items: prev.items.filter((i) => i.id !== item.id),
                }))
                setDeletedItems((prev) => [...prev, item])
                setIsDeleteDialogOpen(false)
                setCurrentItem(null)
                // Show undo toast
                const { dismiss: dismissUndo } = toast({
                  title: "Item Deleted",
                  description: `'${item.name}' deleted. Undo available for 5 seconds.`,
                  action: (
                    <ToastAction altText="Undo" onClick={async () => {
                      try {
                        const res = await fetchWithAuth(`${getApiUrl()}/api/our_menu/`, {
                          method: "POST",
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(item),
                        })
                        if (!res.ok) throw new Error('Failed to restore item')
                        setDeletedItems((prev) => prev.filter((i) => i.id !== item.id))
                        fetchMenu()
                        dismissUndo()
                        toast({ title: "Item Restored", description: `'${item.name}' has been restored.` })
                      } catch (error) {
                        toast({ title: "Error", description: "Failed to restore item", variant: "destructive" })
                      }
                    }}>Undo</ToastAction>
                  ),
                })
                if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current)
                undoTimeoutRef.current = setTimeout(() => {
                  setDeletedItems((prev) => prev.filter((i) => i.id !== item.id))
                  dismissUndo()
                }, 5000)
              } catch (err: any) {
                toast({
                  title: "Error",
                  description: `Failed to delete item: ${err.message}`,
                  variant: "destructive",
                })
              }
            }}
          >
            Delete
          </Button>
        </div>
      ),
    })
  }

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    setIsAddingCategory(true);
    try {
      const res = await fetchWithAuth(`${getApiUrl()}/api/categories/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName }),
      });
      if (!res.ok) throw new Error("Failed to add category");
      const cat = await res.json();
      setCategories((prev) => [...prev, cat]);
      setNewCategoryName("");
      setIsAddCategoryDialogOpen(false);
      setNewItem((prev) => ({ ...prev, category: cat.id }));
      toast({ title: "Category Added", description: `Category '${cat.name}' added.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsAddingCategory(false);
    }
  };

  const handleAddCategoryEdit = async () => {
    if (!newCategoryNameEdit.trim()) return;
    setIsAddingCategoryEdit(true);
    try {
      const res = await fetchWithAuth(`${getApiUrl()}/api/categories/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryNameEdit }),
      });
      if (!res.ok) throw new Error("Failed to add category");
      const cat = await res.json();
      setCategories((prev) => [...prev, cat]);
      setNewCategoryNameEdit("");
      setIsAddCategoryOpenEdit(false);
      setCurrentItem((prev) => prev ? { ...prev, category: cat.id } : prev);
      toast({ title: "Category Added", description: `Category '${cat.name}' added.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsAddingCategoryEdit(false);
    }
  };

  const handleAddAttribute = () => {
    const attr = newAttribute.trim();
    if (attr && !attributeOptions.includes(attr)) {
      setAttributeOptions(prev => [...prev, attr]);
    }
    setNewAttribute("");
  };

  const filteredItems = menuData.items.filter(item =>
    (filterText === "" ||
      item.name.toLowerCase().includes(filterText.toLowerCase()) ||
      item.description.toLowerCase().includes(filterText.toLowerCase())) &&
    (selectedCategories.length === 0 ||
      (item.category !== undefined && item.category !== null && selectedCategories.includes(item.category))) &&
    (selectedAttributes.length === 0 ||
      (item.attributes && selectedAttributes.every(attr => item.attributes.includes(attr))))
  );

  // Custom Option for attributes with trash icon
  const getAttributeOption = (onDelete: (val: string) => void) => (props: OptionProps<{ value: string, label: string }>) => {
    const { data, innerProps } = props;
    return (
      <div {...innerProps} className="flex items-center justify-between px-3 py-2 hover:bg-muted cursor-pointer">
        <span>{data.label}</span>
        <button
          type="button"
          className="ml-2 text-red-500 hover:text-red-700"
          onClick={e => {
            e.stopPropagation();
            handleDeleteAttribute(data.value);
            onDelete(data.value);
          }}
          aria-label={`Delete ${data.label}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    );
  };

  // Custom Option for categories with trash icon
  const getCategoryOption = (onDelete: (val: number) => void) => (props: OptionProps<{ value: number, label: string }>) => {
    const { data, innerProps } = props;
    return (
      <div {...innerProps} className="flex items-center justify-between px-3 py-2 hover:bg-muted cursor-pointer">
        <span>{data.label}</span>
        <button
          type="button"
          className="ml-2 text-red-500 hover:text-red-700"
          onClick={e => {
            e.stopPropagation();
            handleDeleteCategory(data.value);
            onDelete(data.value);
          }}
          aria-label={`Delete ${data.label}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    );
  };

  // When deleting an attribute
  const handleDeleteAttribute = (attr: string) => {
    setDeletedAttributes(prev => {
      const updated = new Set(prev);
      updated.add(attr);
      localStorage.setItem('deletedAttributes', JSON.stringify(Array.from(updated)));
      return updated;
    });
    setAttributeOptions(prev => prev.filter(a => a !== attr));
    setNewItem(prev => ({ ...prev, attributes: (prev.attributes || []).filter(a => a !== attr) }));
  };

  // When deleting a category
  const handleDeleteCategory = (id: number) => {
    setDeletedCategories(prev => {
      const updated = new Set(prev);
      updated.add(id);
      localStorage.setItem('deletedCategories', JSON.stringify(Array.from(updated)));
      return updated;
    });
    setCategories(prev => prev.filter(cat => cat.id !== id));
    setNewItem(prev => ({ ...prev, category: prev.category === id ? null : prev.category }));
  };

  if (fetchError) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {fetchError}
            <Button
              variant="outline"
              className="mt-4 w-full border-primary text-primary hover:bg-primary/10"
              onClick={fetchMenu}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:w-auto">
          <h2 className="text-3xl font-bold tracking-tight">Menu Management</h2>
          <p className="text-muted-foreground">Manage your restaurant menu items and pricing.</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Add New Item
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 max-w-sm w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search menu items..."
            className="pl-9 border-input bg-background text-foreground placeholder-muted-foreground w-full"
          />
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <Input
          type="text"
          placeholder="Filter menu items..."
          value={filterText}
          onChange={e => setFilterText(e.target.value)}
          className="w-full max-w-xs border-input bg-background text-foreground placeholder-muted-foreground"
        />
        <Button variant="outline" onClick={() => setIsFilterOpen(true)}>Filter</Button>
      </div>

      <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <SheetContent className="w-full sm:w-96 max-h-[90vh] overflow-y-auto" side="right">
          <SheetHeader>
            <SheetTitle>Filter Menu Items</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-6 py-6">
            <div>
              <h4 className="mb-2 text-lg font-semibold">Category</h4>
              <div className="flex flex-col space-y-2 max-h-40 overflow-y-auto">
                {categories.map((cat) => (
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
            <div>
              <h4 className="mb-2 text-lg font-semibold">Attributes</h4>
              <div className="flex flex-col space-y-2 max-h-40 overflow-y-auto">
                {attributeOptions.map((attr) => (
                  <div key={attr} className="flex items-center space-x-2 ml-4">
                    <Checkbox
                      id={`attribute-${attr}`}
                      checked={tempSelectedAttributes.includes(attr)}
                      onCheckedChange={() => {
                        setTempSelectedAttributes((prev) =>
                          prev.includes(attr)
                            ? prev.filter((a) => a !== attr)
                            : [...prev, attr]
                        );
                      }}
                    />
                    <Label htmlFor={`attribute-${attr}`}>{attr}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <SheetFooter>
            <SheetClose asChild>
              <Button onClick={() => {
                setSelectedCategories(tempSelectedCategories);
                setSelectedAttributes(tempSelectedAttributes);
                setIsFilterOpen(false);
              }}>Apply Filters</Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Card className="border border-border">
        <CardHeader>
          <CardTitle>All Menu Items</CardTitle>
          <CardDescription>View and manage all menu items.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array(6)
                .fill(0)
                .map((_, i) => (
                  <Skeleton key={i} className="h-64 w-full rounded-lg" />
                ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <p className="text-muted-foreground">No menu items available.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => (
                <Card key={item.id} className="overflow-hidden border border-border">
                  <div className="aspect-video relative w-full">
                    <img
                      src={item.image || "/placeholder.svg"}
                      alt={item.name}
                      className="object-cover w-full h-full max-w-full"
                    />
                  </div>
                  <CardContent className="p-4">
                    <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2">
                      <div>
                        <h3 className="font-semibold break-words max-w-full">{item.name}</h3>
                      </div>
                      <div className="font-bold">Rs {Number(item.price).toFixed(2)}</div>
                    </div>
                    <p className="text-sm mt-2 line-clamp-2 break-words">{item.description}</p>
                    <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between mt-4 gap-2">
                      <div className="flex gap-1 flex-wrap">
                        {item.attributes.map((attr) => (
                          <Badge
                            key={attr}
                            variant="outline"
                            className={
                              attr === "Vegetarian"
                                ? "text-green-600 border-green-600"
                                : attr === "Spicy"
                                ? "text-red-600 border-red-600"
                                : attr === "New"
                                ? "text-purple-600 border-purple-600"
                                : "text-orange-600 border-orange-600"
                            }
                          >
                            {attr}
                          </Badge>
                        ))}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-foreground hover:bg-muted">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => {
                              setCurrentItem(item)
                              setIsEditDialogOpen(true)
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteItem(item)}
                            className="text-red-600"
                          >
                            <Trash className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Item Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[480px] w-full max-w-full px-0 py-0 bg-background text-foreground border-none rounded-2xl shadow-2xl animate-fade-in-scale" style={{ animation: 'fadeInScale 0.3s cubic-bezier(0.4,0,0.2,1)' }}>
          <div className="p-6" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2"><PlusCircle className="h-6 w-6 text-primary" /> Add New Menu Item</DialogTitle>
              <DialogDescription className="mb-4">Fill out the details below to create a new menu item for your restaurant.</DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {/* Basic Info Section */}
              <div>
                <h4 className="text-lg font-semibold mb-2 flex items-center gap-2"><Info className="h-5 w-5 text-muted-foreground" /> Basic Info</h4>
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="name" className="text-sm flex items-center gap-2"><Tag className="h-4 w-4 text-muted-foreground" /> Name</Label>
                    <Input
                      id="name"
                      value={newItem.name}
                      onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                      className={`mt-1 text-sm h-9 border-input bg-background text-foreground w-full rounded-lg ${addFormErrors.name ? 'border-red-500' : ''}`}
                      placeholder="e.g. Chicken Alfredo"
                      aria-invalid={!!addFormErrors.name}
                      aria-describedby="add-item-name-error"
                    />
                    {addFormErrors.name && <span id="add-item-name-error" className="text-xs text-red-500">{addFormErrors.name}</span>}
                  </div>
                  <div>
                    <Label htmlFor="description" className="text-sm flex items-center gap-2"><Info className="h-4 w-4 text-muted-foreground" /> Description</Label>
                    <Textarea
                      id="description"
                      value={newItem.description}
                      onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                      className="mt-1 text-sm h-20 border-input bg-background text-foreground w-full rounded-lg"
                      placeholder="e.g. Creamy pasta with grilled chicken"
                    />
                  </div>
                </div>
              </div>
              {/* Pricing Section */}
              <div>
                <h4 className="text-lg font-semibold mb-2 flex items-center gap-2"><DollarSign className="h-5 w-5 text-muted-foreground" /> Pricing</h4>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="price" className="text-sm flex items-center gap-2"><DollarSign className="h-4 w-4 text-muted-foreground" /> Price</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={newItem.price}
                      onChange={(e) => setNewItem({ ...newItem, price: Number.parseFloat(e.target.value) })}
                      className={`mt-1 text-sm h-9 border-input bg-background text-foreground w-full rounded-lg ${addFormErrors.price ? 'border-red-500' : ''}`}
                      min="0"
                      aria-invalid={!!addFormErrors.price}
                      aria-describedby="add-item-price-error"
                    />
                    <span className="text-xs text-muted-foreground">Enter the price in local currency.</span>
                    {addFormErrors.price && <span id="add-item-price-error" className="text-xs text-red-500">{addFormErrors.price}</span>}
                  </div>
                  <div>
                    <Label htmlFor="rating" className="text-sm flex items-center gap-2"><Star className="h-4 w-4 text-muted-foreground" /> Rating</Label>
                    <Input
                      id="rating"
                      type="number"
                      step="0.1"
                      value={newItem.rating ?? ""}
                      onChange={(e) => setNewItem({ ...newItem, rating: Number.parseFloat(e.target.value) })}
                      className="mt-1 text-sm h-9 border-input bg-background text-foreground w-full rounded-lg"
                      min="0"
                      max="5"
                    />
                    <span className="text-xs text-muted-foreground">Optional. 0-5 stars.</span>
                  </div>
                </div>
              </div>
              {/* Image Section */}
              <div>
                <h4 className="text-lg font-semibold mb-2 flex items-center gap-2"><ImageIcon className="h-5 w-5 text-muted-foreground" /> Image</h4>
                <div className="grid gap-2">
                  <div>
                    <Label htmlFor="image" className="text-sm flex items-center gap-2"><ImageIcon className="h-4 w-4 text-muted-foreground" /> Image URL</Label>
                    <Input
                      id="image"
                      value={newItem.image}
                      onChange={(e) => setNewItem({ ...newItem, image: e.target.value })}
                      className={`mt-1 text-sm h-9 border-input bg-background text-foreground w-full rounded-lg ${addFormErrors.image ? 'border-red-500' : ''}`}
                      placeholder="/placeholder.svg or https://..."
                      aria-invalid={!!addFormErrors.image}
                      aria-describedby="add-item-image-error"
                    />
                    <span className="text-xs text-muted-foreground">Paste a direct image URL or use /placeholder.svg</span>
                    {addFormErrors.image && <span id="add-item-image-error" className="text-xs text-red-500">{addFormErrors.image}</span>}
                  </div>
                  {newItem.image && (
                    <div className="mt-2 flex items-center gap-2">
                      <img
                        src={newItem.image}
                        alt="Preview"
                        className="h-16 w-16 object-cover rounded-lg border"
                        onError={e => (e.currentTarget.style.display = 'none')}
                      />
                      <span className="text-xs text-muted-foreground">Live preview</span>
                    </div>
                  )}
                </div>
              </div>
              {/* Attributes Section */}
              <div>
                <h4 className="text-lg font-semibold mb-2 flex items-center gap-2"><ListChecks className="h-5 w-5 text-muted-foreground" /> Attributes</h4>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2 items-center">
                    <div className="w-full">
                      <Select
                        id="attributes"
                        isMulti
                        options={toOptions(attributeOptions)}
                        value={toOptions(newItem.attributes || [])}
                        onChange={opts => setNewItem({ ...newItem, attributes: (opts as any[]).map(o => o.value) })}
                        classNamePrefix="react-select"
                        placeholder="Select or add attributes"
                        components={{ Option: getAttributeOption((val: string) => {
                          handleDeleteAttribute(val);
                        }) }}
                        menuPlacement="auto"
                        isClearable={false}
                        styles={selectStyles}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="ml-2"
                      onClick={() => setIsAddAttributeDialogOpen(true)}
                    >
                      + Add Attribute
                    </Button>
                  </div>
                </div>
              </div>
              {/* Category & Availability Section */}
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div>
                  <Label htmlFor="category" className="text-sm flex items-center gap-2"><Tag className="h-4 w-4 text-muted-foreground" /> Category</Label>
                  <div className="flex items-center gap-2 w-full">
                    <div className="w-full">
                      <Select
                        id="category"
                        options={toCategoryOptions(categories)}
                        value={toCategoryOptions(categories).find(opt => opt.value === newItem.category) || null}
                        onChange={opt => setNewItem({ ...newItem, category: opt ? (opt as any).value : null })}
                        classNamePrefix="react-select"
                        placeholder="Select category"
                        components={{ Option: getCategoryOption((val: number) => {
                          handleDeleteCategory(val);
                        }) }}
                        menuPlacement="auto"
                        isClearable
                        isDisabled={isCategoriesLoading}
                        styles={selectStyles}
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="ml-2 mt-2"
                    onClick={() => setIsAddCategoryDialogOpen(true)}
                  >
                    + Add Category
                  </Button>
                </div>
                <div className="flex items-center gap-2 mt-6">
                  <input
                    type="checkbox"
                    id="available"
                    checked={newItem.available ?? true}
                    onChange={(e) => setNewItem({ ...newItem, available: e.target.checked })}
                    className="h-5 w-5 rounded border-input"
                  />
                  <Label htmlFor="available" className="text-sm flex items-center gap-2"><CheckCircle className="h-4 w-4 text-muted-foreground" /> Item is available</Label>
                </div>
              </div>
            </div>
            <DialogFooter className="mt-8 flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
                className="border-input text-foreground hover:bg-muted w-full"
                disabled={isAddingItem}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddItem}
                className="bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2 w-full h-11 text-base rounded-lg shadow-md transition-all duration-150"
                disabled={isAddingItem}
              >
                {isAddingItem && <span className="animate-spin mr-2">⏳</span>} Add Item
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px] w-full max-w-full px-2 bg-background text-foreground border-border">
          <DialogHeader>
            <DialogTitle>Edit Menu Item</DialogTitle>
            <DialogDescription>Modify the details of this menu item.</DialogDescription>
          </DialogHeader>
          {currentItem && (
            <div className="max-h-[70vh] overflow-y-auto">
              <div className="grid gap-2 py-2">
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2">
                  <Label htmlFor="edit-name" className="text-right text-sm sm:col-span-1 col-span-1">Name</Label>
                  <Input
                    id="edit-name"
                    value={currentItem.name}
                    onChange={(e) => setCurrentItem({ ...currentItem, name: e.target.value })}
                    className="sm:col-span-3 col-span-1 text-sm h-8 border-input bg-background text-foreground w-full"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2">
                  <Label htmlFor="edit-description" className="text-right text-sm sm:col-span-1 col-span-1">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={currentItem.description}
                    onChange={(e) => setCurrentItem({ ...currentItem, description: e.target.value })}
                    className="sm:col-span-3 col-span-1 text-sm h-16 border-input bg-background text-foreground w-full"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2">
                  <Label htmlFor="edit-price" className="text-right text-sm sm:col-span-1 col-span-1">Price</Label>
                  <Input
                    id="edit-price"
                    type="number"
                    step="0.01"
                    value={currentItem.price}
                    onChange={(e) => setCurrentItem({ ...currentItem, price: Number.parseFloat(e.target.value) })}
                    className="sm:col-span-3 col-span-1 text-sm h-8 border-input bg-background text-foreground w-full"
                    min="0"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2">
                  <Label htmlFor="edit-image" className="text-right text-sm sm:col-span-1 col-span-1">Image URL</Label>
                  <Input
                    id="edit-image"
                    value={currentItem.image}
                    onChange={(e) => setCurrentItem({ ...currentItem, image: e.target.value })}
                    className="sm:col-span-3 col-span-1 text-sm h-8 border-input bg-background text-foreground w-full"
                    placeholder="/placeholder.svg"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2">
                  <Label htmlFor="edit-rating" className="text-right text-sm sm:col-span-1 col-span-1">Rating</Label>
                  <Input
                    id="edit-rating"
                    type="number"
                    step="0.1"
                    value={currentItem.rating ?? ""}
                    onChange={(e) => setCurrentItem({ ...currentItem, rating: Number.parseFloat(e.target.value) })}
                    className="sm:col-span-3 col-span-1 text-sm h-8 border-input bg-background text-foreground w-full"
                    min="0"
                    max="5"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2">
                  <Label className="text-right text-sm sm:col-span-1 col-span-1">Attributes</Label>
                  <div className="sm:col-span-3 col-span-1 flex gap-2 items-center">
                    <div className="w-full">
                      <Select
                        id="attributes"
                        isMulti
                        options={toOptions(attributeOptions)}
                        value={toOptions(currentItem.attributes || [])}
                        onChange={opts => {
                          const selected = (opts as any[]).map(o => o.value);
                          setCurrentItem({ ...currentItem, attributes: selected });
                        }}
                        classNamePrefix="react-select"
                        placeholder="Select or add attributes"
                        components={{ Option: getAttributeOption((val: string) => {
                          handleDeleteAttribute(val);
                        }) }}
                        menuPlacement="auto"
                        isClearable={false}
                        styles={selectStyles}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="ml-2"
                      onClick={() => setIsAddAttributeDialogOpen(true)}
                    >
                      + Add Attribute
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2">
                  <Label htmlFor="edit-available" className="text-right text-sm sm:col-span-1 col-span-1">Available</Label>
                  <div className="sm:col-span-3 flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="edit-available"
                      checked={currentItem.available}
                      onChange={(e) => setCurrentItem({ ...currentItem, available: e.target.checked })}
                    />
                    <Label htmlFor="edit-available" className="text-sm">Item is available</Label>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2">
                  <Label htmlFor="edit-category" className="text-right text-sm sm:col-span-1 col-span-1">Category</Label>
                  <div className="sm:col-span-3 col-span-1 flex gap-2 items-center">
                    <div className="w-full">
                      <Select
                        id="category"
                        options={toCategoryOptions(categories)}
                        value={toCategoryOptions(categories).find(opt => opt.value === currentItem.category) || null}
                        onChange={opt => setCurrentItem({ ...currentItem, category: opt ? (opt as any).value : null })}
                        classNamePrefix="react-select"
                        placeholder="Select category"
                        components={{ Option: getCategoryOption((val: number) => {
                          handleDeleteCategory(val);
                        }) }}
                        menuPlacement="auto"
                        isClearable
                        isDisabled={isCategoriesLoading}
                        styles={selectStyles}
                      />
                    </div>
                  </div>
                  {isAddCategoryOpenEdit && (
                    <div className="sm:col-span-3 col-span-1 flex gap-2 mt-2">
                      <Input
                        value={newCategoryNameEdit}
                        onChange={e => setNewCategoryNameEdit(e.target.value)}
                        placeholder="New category name"
                        className="text-sm h-8 border-input bg-background text-foreground w-full"
                        disabled={isAddingCategoryEdit}
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddCategoryEdit}
                        disabled={isAddingCategoryEdit || !newCategoryNameEdit.trim()}
                        className="px-2 py-1"
                      >
                        Add
                      </Button>
                    </div>
                  )}
                  {isCategoriesLoading && (
                    <span className="sm:col-span-3 text-sm text-muted-foreground">Loading categories...</span>
                  )}
                  {categoriesError && (
                    <span className="sm:col-span-3 text-sm text-destructive">{categoriesError}</span>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              className="border-input text-foreground hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditItem}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={isAddCategoryDialogOpen} onOpenChange={setIsAddCategoryDialogOpen}>
        <DialogContent
          className="max-w-md w-full rounded-2xl shadow-2xl bg-background text-foreground border-none animate-fade-in-scale"
          style={{ animation: 'fadeInScale 0.3s cubic-bezier(0.4,0,0.2,1)' }}
        >
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
            <DialogDescription>Enter a name for the new category.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!newCategoryName.trim()) return;
              setIsAddingCategory(true);
              try {
                const res = await fetchWithAuth(`${getApiUrl()}/api/categories/`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ name: newCategoryName }),
                });
                if (!res.ok) throw new Error("Failed to add category");
                const cat = await res.json();
                setCategories((prev) => [...prev, cat]);
                setNewCategoryName("");
                setIsAddCategoryDialogOpen(false);
                setNewItem((prev) => ({ ...prev, category: cat.id }));
                toast({ title: "Category Added", description: `Category '${cat.name}' added.` });
              } catch (err: any) {
                toast({ title: "Error", description: err.message });
              } finally {
                setIsAddingCategory(false);
              }
            }}
            className="flex flex-col gap-4 mt-4"
          >
            <Label htmlFor="new-category-name" className="text-sm font-medium">Category Name</Label>
            <Input
              id="new-category-name"
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
              placeholder="e.g. Appetizers"
              className="h-10 text-base rounded-lg border-input bg-background text-foreground"
              autoFocus
              required
            />
            <div className="flex justify-end gap-2 mt-2">
              <Button type="button" variant="ghost" onClick={() => setIsAddCategoryDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isAddingCategory || !newCategoryName.trim()} className="bg-primary text-primary-foreground rounded-lg px-6">
                {isAddingCategory ? <span className="animate-spin mr-2">⏳</span> : null} Add
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Attribute Dialog */}
      <Dialog open={isAddAttributeDialogOpen} onOpenChange={setIsAddAttributeDialogOpen}>
        <DialogContent
          className="max-w-md w-full rounded-2xl shadow-2xl bg-background text-foreground border-none animate-fade-in-scale"
          style={{ animation: 'fadeInScale 0.3s cubic-bezier(0.4,0,0.2,1)' }}
        >
          <DialogHeader>
            <DialogTitle>Add New Attribute</DialogTitle>
            <DialogDescription>Enter a name for the new attribute.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!newAttributeName.trim()) return;
              setIsAddingAttribute(true);
              try {
                // Add attribute locally (since attributes are not saved to backend)
                setAttributeOptions((prev) => [...prev, newAttributeName]);
                setNewItem((prev) => ({ ...prev, attributes: [...(prev.attributes || []), newAttributeName] }));
                setNewAttributeName("");
                setIsAddAttributeDialogOpen(false);
                toast({ title: "Attribute Added", description: `Attribute '${newAttributeName}' added.` });
              } catch (err: any) {
                toast({ title: "Error", description: err.message });
              } finally {
                setIsAddingAttribute(false);
              }
            }}
            className="flex flex-col gap-4 mt-4"
          >
            <Label htmlFor="new-attribute-name" className="text-sm font-medium">Attribute Name</Label>
            <Input
              id="new-attribute-name"
              value={newAttributeName}
              onChange={e => setNewAttributeName(e.target.value)}
              placeholder="e.g. Spicy"
              className="h-10 text-base rounded-lg border-input bg-background text-foreground"
              autoFocus
              required
            />
            <div className="flex justify-end gap-2 mt-2">
              <Button type="button" variant="ghost" onClick={() => setIsAddAttributeDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isAddingAttribute || !newAttributeName.trim()} className="bg-primary text-primary-foreground rounded-lg px-6">
                {isAddingAttribute ? <span className="animate-spin mr-2">⏳</span> : null} Add
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}