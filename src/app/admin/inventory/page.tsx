"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Package, AlertTriangle, TrendingUp, TrendingDown, Plus, Edit, BarChart2, LineChart, Clock, Download, RefreshCw, MoreVertical, Trash, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { InventoryItem, InventoryAlert, StockIn, StockOut, Supplier, InventoryCategory } from "@/lib/types"
import { InventoryItemForm } from "@/components/inventory/InventoryItemForm"
import { StockInForm } from "@/components/inventory/StockInForm"
import { StockOutForm } from "@/components/inventory/StockOutForm"
import { exportToCSV } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AnimatePresence, motion } from "framer-motion"
import { useLoading } from '@/contexts/LoadingContext'
import { CreateSupplierDialog } from "@/components/inventory/CreateSupplierDialog"
import { getInventoryCategories } from '@/lib/api-service'

export default function InventoryPage() {
  const { setShow } = useLoading();
  useEffect(() => { setShow(false); }, [setShow]);

  const [activeTab, setActiveTab] = useState("overview")
  const [items, setItems] = useState<InventoryItem[]>([])
  const [alerts, setAlerts] = useState<InventoryAlert[]>([])
  const [stockIns, setStockIns] = useState<StockIn[]>([])
  const [stockOuts, setStockOuts] = useState<StockOut[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const [isItemFormOpen, setIsItemFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [isStockInFormOpen, setIsStockInFormOpen] = useState(false)
  const [isStockOutFormOpen, setIsStockOutFormOpen] = useState(false)
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false)
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false)

  const [categories, setCategories] = useState<InventoryCategory[]>([])

  const API_BASE_URL = "http://127.0.0.1:8000/api/inventory/"

  const handleMarkAsRead = async (alertId: string | number) => {
    try {
        const token = localStorage.getItem('adminAccessToken');
        if (!token) {
            toast({
                title: "Authentication Error",
                description: "You are not logged in.",
                variant: "destructive",
            });
            return;
        }

        const response = await fetch(`${API_BASE_URL}alerts/${alertId}/`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ is_read: true })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to mark alert as read.');
        }

        setAlerts(alerts.map(a => a.id === alertId ? { ...a, is_read: true } : a));
        toast({
            title: "Success",
            description: "Alert marked as read.",
        });
    } catch (error) {
        console.error("Error marking alert as read:", error);
        let errorMessage = "Could not mark alert as read.";
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive"
        });
    }
};

  const fetchInventoryData = async () => {
    try {
      setLoading(true)

      const token = localStorage.getItem('adminAccessToken');
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "You are not logged in. Please log in and try again.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const [itemsRes, alertsRes, stockInsRes, stockOutsRes, suppliersRes] = await Promise.all([
        fetch(`${API_BASE_URL}items/`, { headers }),
        fetch(`${API_BASE_URL}alerts/`, { headers }),
        fetch(`${API_BASE_URL}stock-ins/`, { headers }),
        fetch(`${API_BASE_URL}stock-outs/`, { headers }),
        fetch(`${API_BASE_URL}suppliers/`, { headers }),
      ])

      if ([itemsRes, alertsRes, stockInsRes, stockOutsRes, suppliersRes].some(res => res.status === 403)) {
          throw new Error("Authentication failed. Please log in again.");
      }

      if (!itemsRes.ok || !alertsRes.ok || !stockInsRes.ok || !stockOutsRes.ok || !suppliersRes.ok) {
        throw new Error("One or more inventory API requests failed")
      }

      const [itemsData, alertsData, stockInsData, stockOutsData, suppliersData] = await Promise.all([
        itemsRes.json(),
        alertsRes.json(),
        stockInsRes.json(),
        stockOutsRes.json(),
        suppliersRes.json()
      ])

      setItems(itemsData)
      setAlerts(alertsData)
      setStockIns(stockInsData)
      setStockOuts(stockOutsData)
      setSuppliers(suppliersData)
    } catch (error) {
      console.error("Error fetching inventory data:", error)
       let errorMessage = "Failed to load inventory data";
       if (error instanceof Error) {
         errorMessage = error.message;
       }
        toast({
          title: "Error",
         description: errorMessage,
          variant: "destructive"
        })
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    toast({title: "Refreshing data..."})
    fetchInventoryData();
  }

  const handleExport = () => {
    if(items.length === 0) {
      toast({title: "No data to export", variant: "destructive"});
      return;
    }
    const dataToExport = items.map(item => ({
      ID: item.id,
      Name: item.name,
      Code: item.code,
      Category: item.category?.name || 'N/A',
      Supplier: item.supplier?.name || 'N/A',
      'Current Stock': item.current_stock,
      Unit: item.unit,
      'Purchase Price': item.purchase_price,
      'Stock Value': item.stock_value,
      'Low Stock Threshold': item.minimum_threshold,
      'Expiry Date': item.expiry_date || 'N/A',
    }));
    exportToCSV(dataToExport, "inventory_items");
    toast({title: "Exported successfully"});
  }

  const handleFormSuccess = () => {
    setIsItemFormOpen(false)
    setIsStockInFormOpen(false)
    setIsStockOutFormOpen(false)
    setEditingItem(null)
    fetchInventoryData()
  }
  
  const openEditDialog = (item: InventoryItem) => {
    setEditingItem(item)
    setIsItemFormOpen(true)
  }

  const openNewDialog = () => {
    setEditingItem(null)
    setIsItemFormOpen(true)
  }

  const lowStockItems = items.filter(item => item.is_low_stock)
  const outOfStockItems = items.filter(item => Number(item.current_stock) <= 0)
  const totalStockValue = items.reduce((sum, item) => sum + (item.stock_value || 0), 0)

  // Calculate value by category for the table
  const valueByCategory = items.reduce((acc, item) => {
    // Support both object and id for item.category
    const categoryId = item.category?.id || item.category || "uncategorized";
    if (!acc[categoryId]) {
      acc[categoryId] = { count: 0, value: 0 };
    }
    acc[categoryId].count += 1;
    acc[categoryId].value += item.stock_value || 0;
    return acc;
  }, {} as Record<string | number, { count: number; value: number }>);

  useEffect(() => {
    fetchInventoryData();
    // Fetch all inventory categories for the Stock Value by Category table
    getInventoryCategories().then(cats => {
      setCategories(cats);
      console.log('Fetched inventory categories:', cats);
    }).catch(() => setCategories([]));
    const timeout = setTimeout(() => setLoading(false), 10000); // fallback
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const handler = () => setIsAddItemDialogOpen(true);
    window.addEventListener('reopen-inventory-item-dialog', handler);
    return () => window.removeEventListener('reopen-inventory-item-dialog', handler);
  }, []);

  // Handler to open supplier dialog from item form
  const handleOpenSupplierDialog = () => {
    setIsSupplierDialogOpen(true)
  }

  // Handler when supplier is created
  const handleSupplierCreated = (newSupplier) => {
    setSuppliers((prev) => [...prev, newSupplier])
    setIsSupplierDialogOpen(false)
  }

  // --- DELETE HANDLERS ---
  const handleDeleteItem = (id: number) => {
    toast({
      title: "Delete Item?",
      description: "Are you sure you want to delete this item? This action cannot be undone.",
      icon: <Trash className="h-5 w-5 text-blue-500" />,
      action: (
        <Button className="bg-blue-100 text-blue-700 hover:bg-blue-200" onClick={() => confirmDeleteItem(id)}>
          <Trash className="h-4 w-4 mr-1" /> Delete
        </Button>
      ),
      className: "bg-blue-50 border-blue-200 text-blue-900",
    });
  };
  const confirmDeleteItem = async (id: number) => {
    const token = localStorage.getItem('adminAccessToken');
    await fetch(`${API_BASE_URL}items/${id}/`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    toast({ title: "Item deleted" });
    fetchInventoryData();
  };
  const handleDeleteAllItems = () => {
    toast({
      title: "Delete All Items?",
      description: "Are you sure you want to delete ALL items? This action cannot be undone.",
      icon: <Trash className="h-5 w-5 text-blue-500" />,
      action: (
        <Button className="bg-blue-100 text-blue-700 hover:bg-blue-200" onClick={confirmDeleteAllItems}>
          <Trash className="h-4 w-4 mr-1" /> Delete All
        </Button>
      ),
      className: "bg-blue-50 border-blue-200 text-blue-900",
    });
  };
  const confirmDeleteAllItems = async () => {
    const token = localStorage.getItem('adminAccessToken');
    await Promise.all(items.map(item => fetch(`${API_BASE_URL}items/${item.id}/`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } })));
    toast({ title: "All items deleted" });
    fetchInventoryData();
  };
  // Stock In
  const handleDeleteStockIn = (id: number) => {
    toast({
      title: "Delete Stock In?",
      description: "Are you sure you want to delete this stock in record? This action cannot be undone.",
      icon: <Trash className="h-5 w-5 text-blue-500" />,
      action: (
        <Button className="bg-blue-100 text-blue-700 hover:bg-blue-200" onClick={() => confirmDeleteStockIn(id)}>
          <Trash className="h-4 w-4 mr-1" /> Delete
        </Button>
      ),
      className: "bg-blue-50 border-blue-200 text-blue-900",
    });
  };
  const confirmDeleteStockIn = async (id: number) => {
    const token = localStorage.getItem('adminAccessToken');
    await fetch(`${API_BASE_URL}stock-ins/${id}/`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    toast({ title: "Stock In deleted" });
    fetchInventoryData();
  };
  const handleDeleteAllStockIn = () => {
    toast({
      title: "Delete All Stock In?",
      description: "Are you sure you want to delete ALL stock in records? This action cannot be undone.",
      icon: <Trash className="h-5 w-5 text-blue-500" />,
      action: (
        <Button className="bg-blue-100 text-blue-700 hover:bg-blue-200" onClick={confirmDeleteAllStockIn}>
          <Trash className="h-4 w-4 mr-1" /> Delete All
        </Button>
      ),
      className: "bg-blue-50 border-blue-200 text-blue-900",
    });
  };
  const confirmDeleteAllStockIn = async () => {
    const token = localStorage.getItem('adminAccessToken');
    await Promise.all(stockIns.map(s => fetch(`${API_BASE_URL}stock-ins/${s.id}/`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } })));
    toast({ title: "All stock in records deleted" });
    fetchInventoryData();
  };
  // Stock Out
  const handleDeleteStockOut = (id: number) => {
    toast({
      title: "Delete Stock Out?",
      description: "Are you sure you want to delete this stock out record? This action cannot be undone.",
      icon: <Trash className="h-5 w-5 text-blue-500" />,
      action: (
        <Button className="bg-blue-100 text-blue-700 hover:bg-blue-200" onClick={() => confirmDeleteStockOut(id)}>
          <Trash className="h-4 w-4 mr-1" /> Delete
        </Button>
      ),
      className: "bg-blue-50 border-blue-200 text-blue-900",
    });
  };
  const confirmDeleteStockOut = async (id: number) => {
    const token = localStorage.getItem('adminAccessToken');
    await fetch(`${API_BASE_URL}stock-outs/${id}/`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    toast({ title: "Stock Out deleted" });
    fetchInventoryData();
  };
  const handleDeleteAllStockOut = () => {
    toast({
      title: "Delete All Stock Out?",
      description: "Are you sure you want to delete ALL stock out records? This action cannot be undone.",
      icon: <Trash className="h-5 w-5 text-blue-500" />,
      action: (
        <Button className="bg-blue-100 text-blue-700 hover:bg-blue-200" onClick={confirmDeleteAllStockOut}>
          <Trash className="h-4 w-4 mr-1" /> Delete All
        </Button>
      ),
      className: "bg-blue-50 border-blue-200 text-blue-900",
    });
  };
  const confirmDeleteAllStockOut = async () => {
    const token = localStorage.getItem('adminAccessToken');
    await Promise.all(stockOuts.map(s => fetch(`${API_BASE_URL}stock-outs/${s.id}/`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } })));
    toast({ title: "All stock out records deleted" });
    fetchInventoryData();
  };
  // Alerts
  const handleDeleteAlert = (id: number) => {
    toast({
      title: "Delete Alert?",
      description: "Are you sure you want to delete this alert? This action cannot be undone.",
      icon: <Trash className="h-5 w-5 text-blue-500" />,
      action: (
        <Button className="bg-blue-100 text-blue-700 hover:bg-blue-200" onClick={() => confirmDeleteAlert(id)}>
          <Trash className="h-4 w-4 mr-1" /> Delete
        </Button>
      ),
      className: "bg-blue-50 border-blue-200 text-blue-900",
    });
  };
  const confirmDeleteAlert = async (id: number) => {
    const token = localStorage.getItem('adminAccessToken');
    await fetch(`${API_BASE_URL}alerts/${id}/`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    toast({ title: "Alert deleted" });
    fetchInventoryData();
  };
  const handleDeleteAllAlerts = () => {
    toast({
      title: "Delete All Alerts?",
      description: "Are you sure you want to delete ALL alerts? This action cannot be undone.",
      icon: <Trash className="h-5 w-5 text-blue-500" />,
      action: (
        <Button className="bg-blue-100 text-blue-700 hover:bg-blue-200" onClick={confirmDeleteAllAlerts}>
          <Trash className="h-4 w-4 mr-1" /> Delete All
        </Button>
      ),
      className: "bg-blue-50 border-blue-200 text-blue-900",
    });
  };
  const confirmDeleteAllAlerts = async () => {
    const token = localStorage.getItem('adminAccessToken');
    await Promise.all(alerts.map(a => fetch(`${API_BASE_URL}alerts/${a.id}/`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } })));
    toast({ title: "All alerts deleted" });
    fetchInventoryData();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <RefreshCw className="h-10 w-10 text-orange-500 animate-spin mb-4" />
        <p className="text-lg font-semibold">Please wait…</p>
        <p className="text-sm text-gray-500">Loading section, this may take a few seconds.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex-grow"></div>
        <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2">
              <Button onClick={openNewDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
              <Button variant="outline" onClick={() => setIsStockInFormOpen(true)}>
                <TrendingUp className="mr-2 h-4 w-4" /> 
                Add Stock In
              </Button>
              <Button variant="outline" onClick={() => setIsStockOutFormOpen(true)}>
                <TrendingDown className="mr-2 h-4 w-4" />
                Add Stock Out
              </Button>
              <Button variant="outline" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export Data
              </Button>
              <Button variant="outline" onClick={handleRefresh}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>

            <div className="md:hidden">
                <Button onClick={openNewDialog} className="mr-2">
                    <Plus className="mr-2 h-4 w-4" />
                    Add
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setIsStockInFormOpen(true)}>
                            <TrendingUp className="mr-2 h-4 w-4" />
                            Add Stock In
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setIsStockOutFormOpen(true)}>
                            <TrendingDown className="mr-2 h-4 w-4" />
                            Add Stock Out
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleExport}>
                            <Download className="mr-2 h-4 w-4" />
                            Export Data
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleRefresh}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Refresh
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <Dialog open={isItemFormOpen} onOpenChange={setIsItemFormOpen}>
                <DialogContent className="sm:max-w-[625px]">
                    <DialogHeader>
                        <DialogTitle>{editingItem ? 'Edit' : 'Add New'} Inventory Item</DialogTitle>
                    </DialogHeader>
                    <AnimatePresence mode="wait">
                      {isItemFormOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 40 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 40 }}
                          transition={{ duration: 0.3, ease: 'easeOut' }}
                        >
                          <InventoryItemForm
                            item={editingItem}
                            onSuccess={handleFormSuccess}
                            suppliers={suppliers}
                            onOpenSupplierDialog={handleOpenSupplierDialog}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                </DialogContent>
            </Dialog>
            <Dialog open={isStockInFormOpen} onOpenChange={setIsStockInFormOpen}>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader><DialogTitle>Add Stock In</DialogTitle></DialogHeader>
                  <StockInForm items={items} suppliers={suppliers} onSuccess={handleFormSuccess} onCancel={() => setIsStockInFormOpen(false)} />
                </DialogContent>
            </Dialog>
            <Dialog open={isStockOutFormOpen} onOpenChange={setIsStockOutFormOpen}>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader><DialogTitle>Add Stock Out</DialogTitle></DialogHeader>
                  <StockOutForm items={items} onSuccess={handleFormSuccess} onCancel={() => setIsStockOutFormOpen(false)} />
                </DialogContent>
            </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="stock-in">Stock In</TabsTrigger>
          <TabsTrigger value="stock-out">Stock Out</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card
              onClick={() => setActiveTab('items')}
              className="cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-blue-200 transition"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-2">
                <div className="text-2xl font-bold">{items.length}</div>
                <p className="text-xs text-muted-foreground">
                  Active inventory items
                </p>
              </CardContent>
            </Card>

            <Card
              onClick={() => setActiveTab('alerts')}
              className="cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-orange-200 transition"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent className="p-2">
                <div className="text-2xl font-bold text-orange-600">{lowStockItems.length}</div>
                <p className="text-xs text-muted-foreground">
                  Items below threshold
                </p>
              </CardContent>
            </Card>

            <Card
              onClick={() => setActiveTab('stock-out')}
              className="cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-red-200 transition"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent className="p-2">
                <div className="text-2xl font-bold text-red-600">{outOfStockItems.length}</div>
                <p className="text-xs text-muted-foreground">
                  Zero stock items
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent className="p-2">
                <div className="text-2xl font-bold text-green-600">
                  Rs {totalStockValue.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Current stock value
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BarChart2 className="h-5 w-5 text-blue-500" /> Stock Value by Category</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[280px] min-h-[160px] p-6 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-center">Items</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.length > 0 ? (
                    categories.map(cat => {
                      const data = valueByCategory[cat.id] || { count: 0, value: 0 };
                      return (
                        <TableRow key={cat.id}>
                          <TableCell className="font-medium">{cat.name}</TableCell>
                          <TableCell className="text-center">{data.count}</TableCell>
                          <TableCell className="text-right">Rs {data.value.toFixed(2)}</TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow><TableCell colSpan={3} className="text-center">No data available</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-green-500" /> Recent Stock In</CardTitle>
                <CardDescription>Latest stock additions</CardDescription>
              </CardHeader>
              <CardContent className="max-h-[280px] min-h-[160px] p-6 overflow-y-auto">
                 <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockIns.slice(0, 5).map(s => (
                        <TableRow key={s.id}>
                          <TableCell>
                            <div className="font-medium">{s.item.name}</div>
                            <div className="text-xs text-muted-foreground">{new Date(s.date).toLocaleDateString()}</div>
                          </TableCell>
                          <TableCell className="text-right">+{s.quantity} {s.item.unit}</TableCell>
                        </TableRow>
                      ))}
                      {stockIns.length === 0 && <TableRow><TableCell colSpan={2} className="text-center">No recent stock in</TableCell></TableRow>}
                    </TableBody>
                  </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><TrendingDown className="h-5 w-5 text-red-500" /> Recent Stock Out</CardTitle>
                <CardDescription>Latest stock usage</CardDescription>
              </CardHeader>
              <CardContent className="max-h-[280px] min-h-[160px] p-6 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockOuts.slice(0, 5).map(s => (
                        <TableRow key={s.id}>
                          <TableCell>
                            <div className="font-medium">{s.item.name}</div>
                            <div className="text-xs text-muted-foreground">{s.reason}</div>
                          </TableCell>
                          <TableCell className="text-right">-{s.quantity} {s.item.unit}</TableCell>
                        </TableRow>
                      ))}
                      {stockOuts.length === 0 && <TableRow><TableCell colSpan={2} className="text-center">No recent stock out</TableCell></TableRow>}
                    </TableBody>
                  </Table>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Low Stock Watch</CardTitle>
                <CardDescription>Items below threshold</CardDescription>
              </CardHeader>
              <CardContent className="max-h-[280px] min-h-[160px] p-6 overflow-y-auto">
                {lowStockItems.length > 0 ? (
                  <ul className="space-y-2">
                    {lowStockItems.map(item => (
                      <li key={item.id} className="flex justify-between items-center">
                        <span>{item.name}</span>
                        <span className="text-orange-600 font-semibold">{item.current_stock} {item.unit}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">No low stock items</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Expiry Watch</CardTitle>
                <CardDescription>Items expiring soon</CardDescription>
              </CardHeader>
              <CardContent className="max-h-[280px] min-h-[160px] p-6 overflow-y-auto">
                {items.filter(item => item.expiry_date).length > 0 ? (
                  <ul className="space-y-2">
                    {items.filter(item => item.expiry_date).map(item => (
                      <li key={item.id} className="flex justify-between items-center">
                        <span>{item.name}</span>
                        <span className="text-red-600 font-semibold">{item.expiry_date}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">No items with expiry dates</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest inventory actions</CardDescription>
            </CardHeader>
            <CardContent className="max-h-[280px] min-h-[160px] p-6 overflow-y-auto">
              <ul className="space-y-2">
                {stockIns.slice(0, 3).map(s => (
                  <li key={"in-"+s.id} className="flex items-center gap-2 text-green-700">
                    <TrendingUp className="h-4 w-4" /> Stock In: {s.item.name} +{s.quantity} {s.item.unit}
                  </li>
                ))}
                {stockOuts.slice(0, 3).map(s => (
                  <li key={"out-"+s.id} className="flex items-center gap-2 text-red-700">
                    <TrendingDown className="h-4 w-4" /> Stock Out: {s.item.name} -{s.quantity} {s.item.unit}
                  </li>
                ))}
                {alerts.slice(0, 3).map(a => (
                  <li key={"alert-"+a.id} className="flex items-center gap-2 text-yellow-700">
                    <AlertTriangle className="h-4 w-4" /> Alert: {a.item_name || "Unknown"} ({a.alert_type})
                  </li>
                ))}
                {stockIns.length === 0 && stockOuts.length === 0 && alerts.length === 0 && (
                  <li className="text-muted-foreground">No recent activity</li>
                )}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Inventory Items</CardTitle>
                <CardDescription>Manage your inventory items and track stock levels</CardDescription>
              </div>
              <Button variant="destructive" onClick={handleDeleteAllItems} size="sm"><Trash2 className="h-4 w-4 mr-2" />Delete All</Button>
            </CardHeader>
            <CardContent className="max-h-[500px] min-h-[350px] p-8 overflow-y-auto">
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{item.name}</h3>
                        <Badge variant="outline">{item.code}</Badge>
                        {item.is_low_stock && (
                          <Badge variant="destructive">Low Stock</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Current: {item.current_stock} {item.unit} | 
                        Min: {item.minimum_threshold} {item.unit} | 
                        Value: Rs {(item.stock_value || 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" onClick={() => openEditDialog(item)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => handleDeleteItem(item.id)}>
                        <Trash className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock-in" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Stock In Records</CardTitle>
                <CardDescription>Track all stock additions and purchases</CardDescription>
              </div>
              <Button variant="destructive" onClick={handleDeleteAllStockIn} size="sm"><Trash2 className="h-4 w-4 mr-2" />Delete All</Button>
            </CardHeader>
            <CardContent className="max-h-[500px] min-h-[350px] p-8 overflow-y-auto">
              <div className="space-y-4">
                {stockIns.map((stockIn) => (
                  <div key={stockIn.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Item: {stockIn.item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {stockIn.quantity} units on {new Date(stockIn.date).toLocaleDateString()}
                      </p>
                      {stockIn.invoice_id && (
                        <p className="text-xs text-muted-foreground">Invoice: {stockIn.invoice_id}</p>
                      )}
                    </div>
                    <div className="text-right flex flex-col gap-2 items-end">
                      <p className="font-medium">Rs {stockIn.unit_price || 0}</p>
                      <p className="text-sm text-muted-foreground">
                        Total: Rs {((stockIn.unit_price || 0) * (stockIn.quantity || 0)).toFixed(2)}
                      </p>
                      <Button variant="outline" size="icon" onClick={() => handleDeleteStockIn(stockIn.id)}>
                        <Trash className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock-out" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Stock Out Records</CardTitle>
                <CardDescription>Track all stock usage and consumption</CardDescription>
              </div>
              <Button variant="destructive" onClick={handleDeleteAllStockOut} size="sm"><Trash2 className="h-4 w-4 mr-2" />Delete All</Button>
            </CardHeader>
            <CardContent className="max-h-[500px] min-h-[350px] p-8 overflow-y-auto">
              <div className="space-y-4">
                {stockOuts.map((stockOut) => (
                  <div key={stockOut.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Item: {stockOut.item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {stockOut.quantity} units - {stockOut.reason}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(stockOut.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{stockOut.reason}</Badge>
                      <Button variant="outline" size="icon" onClick={() => handleDeleteStockOut(stockOut.id)}>
                        <Trash className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Alerts</CardTitle>
                <CardDescription>Inventory alerts and warnings</CardDescription>
              </div>
              <Button variant="destructive" onClick={handleDeleteAllAlerts} size="sm"><Trash2 className="h-4 w-4 mr-2" />Delete All</Button>
            </CardHeader>
            <CardContent className="max-h-[500px] min-h-[350px] p-8 overflow-y-auto">
              <div className="space-y-4">
                {alerts.length > 0 ? (
                  <ul className="space-y-2">
                    {alerts.map(alert => {
                      const itemObj = items.find(i => i.id === alert.item);
                      return (
                        <li key={alert.id} className="flex flex-col md:flex-row md:items-center md:justify-between p-3 border rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                          <div>
                            <span className="font-semibold text-orange-700">{alert.alert_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-200">Item: <span className="font-medium">{itemObj ? itemObj.name : alert.item_name || "Unknown"}</span></span>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{alert.message}</div>
                          </div>
                          <div className="flex items-center gap-2 mt-2 md:mt-0 md:ml-4">
                            <span className="text-xs text-gray-400">{new Date(alert.created_at).toLocaleString()}</span>
                            <Button variant="outline" size="icon" onClick={() => handleDeleteAlert(alert.id)}>
                              <Trash className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">No alerts</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <Dialog open={isSupplierDialogOpen} onOpenChange={setIsSupplierDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <CreateSupplierDialog
            isOpen={isSupplierDialogOpen}
            onOpenChange={setIsSupplierDialogOpen}
            onSuccess={handleSupplierCreated}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
} 