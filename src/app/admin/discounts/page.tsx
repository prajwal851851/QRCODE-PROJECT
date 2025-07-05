"use client"

import { useState, useEffect, useCallback } from "react"
import { AdminHeader } from "@/components/admin-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { discounts as initialDiscounts, menuItems } from "@/lib/dummy-data"
import type { Discount, MenuItem } from "@/lib/types"
import { Plus, Edit, Trash2, Calendar, Percent, Tag, MoreHorizontal, Trash } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { MultiSelect } from "react-multi-select-component"
import { fetchWithAuth } from '@/lib/api-service'
import { useLoading } from '@/contexts/LoadingContext'
import { getApiUrl } from '@/lib/api-service'

export default function DiscountManagementPage() {
  const { setShow } = useLoading();
  useEffect(() => { setShow(false); }, [setShow]);

  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [currentDiscount, setCurrentDiscount] = useState<Discount | null>(null)
  const [newDiscount, setNewDiscount] = useState<Omit<Discount, 'id' | 'created_at' | 'updated_at'>>({
    name: "",
    description: "",
    discount_percentage: 0,
    active: true,
    applicable_items: [],
    start_date: null,
    end_date: null,
  })
  const [appliesTo, setAppliesTo] = useState<'all' | 'specific'>('all');
  const [showMenuItemModal, setShowMenuItemModal] = useState(false);

  const { toast } = useToast()

  const fetchDiscounts = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetchWithAuth(`${getApiUrl()}/api/discounts/`)
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
      const data: Discount[] = await res.json()
      setDiscounts(data.map(d => ({ ...d, applicable_items: d.applicable_items || [] })));
      setFetchError(null);
    } catch (err: any) {
      console.error("Failed to fetch discounts:", err.message)
      setFetchError(`Failed to load discounts: ${err.message}. Please try again.`)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchMenuItems = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${getApiUrl()}/api/our_menu/`)
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
      const data: MenuItem[] = await res.json()
      setMenuItems(data)
    } catch (err: any) {
      console.error("Failed to fetch menu items for discount selection:", err.message)
    }
  }, [])

  useEffect(() => {
    fetchDiscounts()
    fetchMenuItems()
  }, [fetchDiscounts, fetchMenuItems])

  useEffect(() => {
    if (isAddDialogOpen) {
      setAppliesTo(newDiscount.applicable_items.length > 0 ? 'specific' : 'all');
    }
  }, [isAddDialogOpen]);

  const handleToggleActive = useCallback(async (discountId: number) => {
    const discountToToggle = discounts.find(d => d.id === discountId);
    if (!discountToToggle) return;

    const newActiveStatus = !discountToToggle.active;

    // Optimistically update the UI
    setDiscounts(discounts.map(d =>
      d.id === discountId ? { ...d, active: newActiveStatus } : d
    ));

    try {
      const res = await fetchWithAuth(`${getApiUrl()}/api/discounts/${discountId}/`, {
        method: "PATCH", // Use PATCH for partial update
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ active: newActiveStatus }),
      });

      if (!res.ok) {
        // Revert UI state if API call fails
        setDiscounts(discounts.map(d =>
          d.id === discountId ? { ...d, active: !newActiveStatus } : d
        ));
        const errorData = await res.json();
        const errorMessage = errorData.detail || JSON.stringify(errorData);
        throw new Error(`Failed to update status: ${errorMessage}`);
      }

      toast({
        title: "Status Updated",
        description: `Discount '${discountToToggle.name}' is now ${newActiveStatus ? 'active' : 'inactive'}.`,
      });

    } catch (error: any) {
      console.error("Failed to toggle discount status:", error);
      toast({
        title: "Error",
        description: `Failed to update status for '${discountToToggle.name}': ${error.message}`,
        variant: "destructive",
      });
      // UI already reverted in case of error
    }
  }, [discounts, toast]); // Add dependencies

  const handleAddDiscount = async () => {
    console.log("Adding discount:", newDiscount)
    const payload = {
      description: newDiscount.description,
      discount_percentage: Number(newDiscount.discount_percentage),
      active: newDiscount.active,
      applicable_items: newDiscount.applicable_items,
      start_date: newDiscount.start_date ? new Date(newDiscount.start_date).toISOString().split('T')[0] : null,
      end_date: newDiscount.end_date ? new Date(newDiscount.end_date).toISOString().split('T')[0] : null,
    };
    console.log("Sending payload:", payload);
    try {
      const res = await fetchWithAuth(`${getApiUrl()}/api/discounts/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Backend Error Data:", errorData);
        const errorMessage = errorData.detail || JSON.stringify(errorData);
        throw new Error(errorMessage);
      }

      toast({
        title: "Discount Added",
        description: "The new discount has been added successfully.",
      });
      setIsAddDialogOpen(false);
      // Reset newDiscount state to default values matching the type
      setNewDiscount({
        name: "",
        description: "",
        discount_percentage: 0,
        active: true,
        applicable_items: [],
        start_date: null,
        end_date: null,
      });
      fetchDiscounts(); // Refresh the list after successful add
    } catch (error: any) {
      console.error("Failed to add discount:", error);
      toast({
        title: "Error",
        description: `Failed to add discount: ${error.message}`,
        variant: "destructive",
      });
    }
  }

  const handleEditDiscount = async () => {
    console.log("Editing discount:", currentDiscount)
    if (!currentDiscount || !currentDiscount.id) {
        toast({
            title: "Error",
            description: "No discount selected for editing.",
            variant: "destructive",
        });
        return;
    }

    const payload = {
        ...currentDiscount,
        // Ensure applicable_items is sent as array of IDs
        applicable_items: Array.isArray(currentDiscount.applicable_items) ? currentDiscount.applicable_items : [],
        // Format dates or use null
        start_date: currentDiscount.start_date || null,
        end_date: currentDiscount.end_date || null,
        // Ensure discount_percentage is a number
        discount_percentage: Number(currentDiscount.discount_percentage),
        // Omit created_at and updated_at as they are read-only
    };
    // Remove potentially problematic fields not expected by backend PUT/PATCH
    delete (payload as any).created_at;
    delete (payload as any).updated_at;

    console.log("Sending edit payload:", payload);

    try {
        // Use PATCH for partial updates, PUT for full replacement (PATCH is generally safer)
        const res = await fetchWithAuth(`${getApiUrl()}/api/discounts/${currentDiscount.id}/`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
             const errorData = await res.json();
             console.error("Backend Error Data (Edit):", errorData);
             const errorMessage = errorData.detail || JSON.stringify(errorData);
             throw new Error(errorMessage);
        }

        toast({
            title: "Discount Updated",
            description: "The discount has been updated successfully.",
        });
        setIsEditDialogOpen(false);
        setCurrentDiscount(null);
        fetchDiscounts(); // Refresh the list

    } catch (error: any) {
        console.error("Failed to edit discount:", error);
        toast({
            title: "Error",
            description: `Failed to update discount: ${error.message}`,
            variant: "destructive",
        });
    }
  }

  const handleDeleteDiscount = async () => {
    console.log("Deleting discount:", currentDiscount)
    if (!currentDiscount || !currentDiscount.id) {
        toast({
            title: "Error",
            description: "No discount selected for deletion.",
            variant: "destructive",
        });
        return;
    }

    try {
        const res = await fetchWithAuth(`${getApiUrl()}/api/discounts/${currentDiscount.id}/`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (!res.ok) {
            const errorData = await res.json();
            console.error("Backend Error Data (Delete):", errorData);
            const errorMessage = errorData.detail || JSON.stringify(errorData);
             throw new Error(errorMessage);
        }

        toast({
            title: "Discount Deleted",
            description: "The discount has been deleted successfully.",
        });
        setIsDeleteDialogOpen(false);
        setCurrentDiscount(null);
        fetchDiscounts(); // Refresh the list

    } catch (error: any) {
        console.error("Failed to delete discount:", error);
        toast({
            title: "Error",
            description: `Failed to delete discount: ${error.message}`,
            variant: "destructive",
        });
    }
  }

  const getDiscountTypeLabel = (type: string) => {
    switch (type) {
      case "percentage":
        return "% off"
      case "fixed":
        return "$ off"
      case "bogo":
        return "Buy One Get One"
      default:
        return ""
    }
  }

  // Helper to get label for applicable items (handles number[])
  const getApplicableItemsLabel = useCallback((itemIDs: number[] | undefined) => {
    if (!itemIDs || itemIDs.length === 0) return "All Items"; // Assuming empty array means all items
    const applicableItemNames = itemIDs
        .map(id => menuItems.find(item => item.id === id))
        .filter(item => item !== undefined)
        .map(item => item!.name);

    if (applicableItemNames.length === 0) return "No items found";
    if (applicableItemNames.length === 1) return applicableItemNames[0];
    return `${applicableItemNames.length} items`;
  }, [menuItems]); // Add menuItems as dependency

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
              onClick={() => { fetchDiscounts(); fetchMenuItems() }}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (isLoading) {
    return <div>Loading discounts...</div>
  }

  return (
    <div>
      <style jsx global>{`
        .custom-multiselect .dropdown-content {
          background-color: #23272f !important;
          color: #f4f4f5 !important;
          border: 1px solid #333646 !important;
        }
        .custom-multiselect .dropdown-heading {
          background-color: #23272f !important;
          color: #f4f4f5 !important;
          border-bottom: 1px solid #333646 !important;
        }
        .custom-multiselect .select-panel {
          background-color: #23272f !important;
          color: #f4f4f5 !important;
          border: none !important;
        }
        .custom-multiselect .chip {
          background-color: #374151 !important;
          color: #fbbf24 !important;
          border: none !important;
        }
        .custom-multiselect .dropdown {
          background-color: #23272f !important;
          color: #f4f4f5 !important;
          border: 1px solid #333646 !important;
        }
        .custom-multiselect .dropdown .search input {
          background-color: #23272f !important;
          color: #f4f4f5 !important;
          border: 1px solid #333646 !important;
        }
        .custom-multiselect .dropdown-content .item {
          color: #f4f4f5 !important;
          background: transparent !important;
        }
        .custom-multiselect .dropdown-content .item.selected {
          background-color: #374151 !important;
          color: #fbbf24 !important;
        }
        .custom-multiselect .dropdown-content .item:hover {
          background-color: #fbbf24 !important;
          color: #18181b !important;
        }
        .custom-multiselect .dropdown-content .item .checkbox {
          accent-color: #fbbf24 !important;
          background: #23272f !important;
        }
        /* Light mode overrides */
        :not(.dark) .custom-multiselect .dropdown-content,
        :not(.dark) .custom-multiselect .dropdown-heading,
        :not(.dark) .custom-multiselect .select-panel,
        :not(.dark) .custom-multiselect .chip,
        :not(.dark) .custom-multiselect .dropdown {
          background-color: #fff !important;
          color: #18181b !important;
          border: 1px solid #e5e7eb !important;
        }
        :not(.dark) .custom-multiselect .dropdown .search input {
          background-color: #fff !important;
          color: #18181b !important;
          border: 1px solid #e5e7eb !important;
        }
        :not(.dark) .custom-multiselect .dropdown-content .item {
          color: #18181b !important;
          background: transparent !important;
        }
        :not(.dark) .custom-multiselect .dropdown-content .item.selected {
          background-color: #f3f4f6 !important;
          color: #18181b !important;
        }
        :not(.dark) .custom-multiselect .dropdown-content .item:hover {
          background-color: #fbbf24 !important;
          color: #18181b !important;
        }
        :not(.dark) .custom-multiselect .dropdown-content .item .checkbox {
          accent-color: #ea580c !important;
          background: #fff !important;
        }
      `}</style>
      <div className="space-y-6 bg-background text-foreground px-2 sm:px-6 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="w-full sm:w-auto">
            <h2 className="text-3xl font-bold tracking-tight">Discounts & Promotions</h2>
            <p className="text-muted-foreground">Manage your discounts and promotions.</p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" /> Add Discount
            </Button>
          </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-64 w-full rounded-lg" />
            ))
          ) : discounts.length === 0 ? (
            <p className="text-muted-foreground col-span-full">No discounts available.</p>
            ) : (
              discounts.map((discount) => (
              <Card key={discount.id} className={`w-full ${!discount.active ? "opacity-70" : ""}`}>
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">{discount.name}</CardTitle>
                  <Badge variant={discount.active ? "default" : "secondary"}>
                    {discount.active ? "Active" : "Inactive"}
                        </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-2">{discount.description}</p>
                        <div className="flex items-center gap-2">
                      <Badge variant="outline">
                            <Percent className="mr-1 h-3 w-3" />
                        {discount.discount_percentage}%
                          </Badge>
                        </div>
                    <div className="space-y-2 text-sm">
                        {discount.start_date && discount.end_date && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground flex items-center">
                            <Calendar className="mr-1 h-3 w-3" /> Valid:
                            </span>
                            <span>
                            {new Date(discount.start_date).toLocaleDateString()} - {new Date(discount.end_date).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      <div className="flex justify-between">
                          <span className="text-muted-foreground">Applies to:</span>
                          <span>{getApplicableItemsLabel(discount.applicable_items)}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={discount.active}
                            onCheckedChange={() => handleToggleActive(discount.id)}
                            id={`active-${discount.id}`}
                          />
                          <Label htmlFor={`active-${discount.id}`}>Active</Label>
                        </div>
                      <div className="space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setCurrentDiscount({ ...discount, applicable_items: discount.applicable_items || [] });
                              setIsEditDialogOpen(true)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setCurrentDiscount(discount)
                              setIsDeleteDialogOpen(true)
                            }}
                          className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Discount</DialogTitle>
              <DialogDescription>Create a new discount or promotion.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="discount_percentage" className="text-right">
                  Percentage (%)
                </Label>
                <Input
                  id="discount_percentage"
                  type="number"
                  value={newDiscount.discount_percentage}
                  onChange={(e) => setNewDiscount({ ...newDiscount, discount_percentage: Number(e.target.value) })}
                  className="col-span-3 bg-white text-black dark:bg-gray-900 dark:text-white"
                  min="0"
                  max="100"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="active" className="text-right">
                  Active
                </Label>
                <div className="flex items-center space-x-2 col-span-3">
                  <Switch
                    id="active"
                    checked={newDiscount.active}
                    onCheckedChange={(checked) => setNewDiscount({ ...newDiscount, active: checked })}
                  />
                  <Label htmlFor="active">Discount is active</Label>
                </div>
              </div>
              <Label className="text-right">Applies To</Label>
              <div className="col-span-3">
                <Select
                  value={appliesTo}
                  onValueChange={(value) => {
                    setAppliesTo(value as 'all' | 'specific');
                    setNewDiscount({
                      ...newDiscount,
                      applicable_items: value === 'all' ? [] : newDiscount.applicable_items,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select where discount applies" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Items</SelectItem>
                    <SelectItem value="specific">Specific Items</SelectItem>
                  </SelectContent>
                </Select>

                {appliesTo === 'specific' && (
                  <>
                    <Button className="mt-2 bg-gray-100 text-black dark:bg-gray-700 dark:text-white" onClick={() => setShowMenuItemModal(true)}>
                      Select Menu Items
                    </Button>
                    <Dialog open={showMenuItemModal} onOpenChange={setShowMenuItemModal}>
                      <DialogContent className="sm:max-w-[500px] bg-white text-black dark:bg-gray-800 dark:text-white">
                        <DialogHeader>
                          <DialogTitle>Select Menu Items</DialogTitle>
                          <DialogDescription>Choose which menu items this discount applies to.</DialogDescription>
                        </DialogHeader>
                        {menuItems.length === 0 ? (
                          <div className="flex items-center justify-center py-8">
                            <span className="text-muted-foreground">Loading menu items...</span>
                          </div>
                        ) : (
                          <MultiSelect
                            className="w-full custom-multiselect"
                            options={menuItems.map(item => ({ label: item.name, value: item.id }))}
                            value={newDiscount.applicable_items.map(itemId => ({ label: menuItems.find(item => item.id === itemId)?.name || '', value: itemId }))}
                            onChange={(selectedOptions: { label: string; value: number }[]) => setNewDiscount({ ...newDiscount, applicable_items: selectedOptions.map((option) => option.value) })}
                            labelledBy="Select Items"
                          />
                        )}
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setShowMenuItemModal(false)}>Cancel</Button>
                          <Button onClick={() => setShowMenuItemModal(false)}>Save</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </>
                )}
                {appliesTo === 'specific' && menuItems.length === 0 && (
                  <p className="text-muted-foreground text-sm mt-2">Loading menu items or no items available.</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddDiscount}>Add Discount</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-white text-black dark:bg-gray-900 dark:text-white">
            <DialogHeader>
              <DialogTitle>Edit Discount</DialogTitle>
              <DialogDescription>Make changes to the discount.</DialogDescription>
            </DialogHeader>
            {currentDiscount && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-discount_percentage" className="text-right">
                    Percentage (%)
                  </Label>
                  <Input
                    id="edit-discount_percentage"
                    type="number"
                    value={currentDiscount.discount_percentage}
                    onChange={(e) => setCurrentDiscount({ ...currentDiscount, discount_percentage: Number(e.target.value) })}
                    className="col-span-3 bg-white text-black dark:bg-gray-900 dark:text-white"
                    min="0"
                    max="100"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-active" className="text-right">
                    Active
                  </Label>
                  <div className="flex items-center space-x-2 col-span-3">
                    <Switch
                      id="edit-active"
                      checked={currentDiscount.active}
                      onCheckedChange={(checked) => setCurrentDiscount({ ...currentDiscount, active: checked })}
                    />
                    <Label htmlFor="edit-active">Discount is active</Label>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditDiscount}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Delete Discount</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this discount? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            {currentDiscount && (
              <div className="py-4">
                <p className="font-medium">{currentDiscount.name}</p>
                <p className="text-sm text-muted-foreground">{currentDiscount.description}</p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteDiscount}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}