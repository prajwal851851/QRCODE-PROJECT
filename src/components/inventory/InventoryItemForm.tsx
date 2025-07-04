"use client"

import { useEffect, useState, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import type { InventoryItem, InventoryCategory, Supplier } from "@/lib/types"
import { CreateCategoryDialog } from "./CreateCategoryDialog"
import { PlusCircle, Barcode, DollarSign, FileText, User, Layers, Calendar, AlertCircle, X, Package, Ruler, Scale, Boxes, Warehouse, Pen, Tag, Trash2 } from "lucide-react"
import { fetchWithAuth } from "@/lib/api-service"
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog';
import { getApiUrl } from "@/lib/api-service";

const itemSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  unit: z.string({ required_error: "Please select a unit." }),
  purchase_price: z.coerce.number().min(0, { message: "Purchase price must be a positive number." }),
  minimum_threshold: z.coerce.number().min(0, { message: "Threshold must be a positive number." }),
  category: z.string({ required_error: "Please select a category." }),
  supplier: z.string().optional(),
  expiry_date: z.string().optional(),
  notes: z.string().optional(),
})

type InventoryItemFormValues = z.infer<typeof itemSchema>

interface InventoryItemFormProps {
  item?: InventoryItem | null
  onSuccess: () => void
  onClose: () => void
  suppliers: Supplier[]
  onOpenSupplierDialog: () => void
}

export function InventoryItemForm({ item, onSuccess, onClose, suppliers, onOpenSupplierDialog }: InventoryItemFormProps) {
  const { toast } = useToast()
  const [categories, setCategories] = useState<InventoryCategory[]>([])
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const [deletedSuppliers, setDeletedSuppliers] = useState<Set<number>>(() => {
    if (typeof window === 'undefined') return new Set();
    const saved = localStorage.getItem('deletedSuppliers');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [deletedCategories, setDeletedCategories] = useState<Set<number>>(() => {
    if (typeof window === 'undefined') return new Set();
    const saved = localStorage.getItem('deletedInventoryCategories');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<InventoryItemFormValues>({
    resolver: zodResolver(itemSchema),
  })

  useEffect(() => {
    if (item) {
      reset({
        name: item.name ?? "",
        unit: item.unit ?? "",
        purchase_price: Number(item.purchase_price) || 0,
        minimum_threshold: Number(item.minimum_threshold) || 0,
        category: item.category && typeof item.category === "object" && (item.category as { id?: unknown }).id !== undefined
          ? String((item.category as { id: unknown }).id)
          : undefined,
        supplier: item.supplier && typeof item.supplier === "object" && (item.supplier as { id?: unknown }).id !== undefined
          ? String((item.supplier as { id: unknown }).id)
          : undefined,
        expiry_date: item.expiry_date ?? undefined,
        notes: item.notes ?? "",
      })
    } else {
      reset({ name: "", unit: "", purchase_price: 0, minimum_threshold: 0, category: undefined, supplier: undefined, expiry_date: undefined, notes: "" })
    }
  }, [item, reset])

  const fetchCategories = async () => {
    try {
      const res = await fetchWithAuth(`${getApiUrl()}/api/inventory/categories/`)
      if (!res.ok) throw new Error("Failed to fetch categories.")
      const data = await res.json()
      setCategories(data.filter((cat: InventoryCategory) => !deletedCategories.has(cat.id)))
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Could not load categories.",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const handleCategoryCreated = (newCategory: InventoryCategory) => {
    setCategories((prev) => [...prev, newCategory])
    setValue("category", String(newCategory.id), { shouldValidate: true })
    setIsCategoryDialogOpen(false)
  }

  const handleDeleteCategory = (id: number) => {
    setCategories(prev => prev.filter(cat => cat.id !== id));
    setDeletedCategories(prev => {
      const updated = new Set(prev);
      updated.add(id);
      localStorage.setItem('deletedInventoryCategories', JSON.stringify(Array.from(updated)));
      return updated;
    });
    if (watch('category') === String(id)) setValue('category', '', { shouldValidate: true });
  };

  const handleDeleteSupplier = (id: number) => {
    setDeletedSuppliers(prev => {
      const updated = new Set(prev);
      updated.add(id);
      localStorage.setItem('deletedSuppliers', JSON.stringify(Array.from(updated)));
      return updated;
    });
    if (watch('supplier') === String(id)) setValue('supplier', '', { shouldValidate: true });
  };

  const onSubmit = async (data: InventoryItemFormValues) => {
    try {
      const method = item ? "PUT" : "POST"
      const url = item
        ? `${getApiUrl()}/api/inventory/items/${item.id}/`
        : `${getApiUrl()}/api/inventory/items/`

      const response = await fetchWithAuth(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Failed to save item.")
      }
      
      toast({
        title: "Success!",
        description: `Item ${item ? "updated" : "created"} successfully.`,
        className: "bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100 border-green-400"
      })
      onSuccess()
    } catch (error) {
      toast({
        title: "Oops! Something went wrong.",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      })
    }
  }

  const FormField = ({ id, label, icon: Icon, error, children }: any) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
        <Icon className="w-4 h-4" />
        {label}
      </Label>
      {children}
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error.message}
        </p>
      )}
    </div>
  );

  // Helper for close button: call onClose if provided, else try to close nearest dialog
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      // Fallback: try to close nearest dialog
      const dialog = document.querySelector('[role="dialog"]');
      if (dialog && typeof (dialog as any).close === 'function') {
        (dialog as any).close();
      }
    }
  };

  const allUnits = [
    { value: "kg", label: "Kilogram (kg)" },
    { value: "g", label: "Gram (g)" },
    { value: "mg", label: "Milligram (mg)" },
    { value: "ng", label: "Nanogram (ng)" },
    { value: "µg", label: "Microgram (µg)" },
    { value: "dg", label: "Decigram (dg)" },
    { value: "hg", label: "Hectogram (hg)" },
    { value: "ton", label: "Ton (t)" },
    { value: "mt", label: "Metric Ton (mt)" },
    { value: "st", label: "Stone (st)" },
    { value: "ct", label: "Carat (ct)" },
    { value: "gr", label: "Grain (gr)" },
    { value: "oz", label: "Ounce (oz)" },
    { value: "lb", label: "Pound (lb)" },
    { value: "dr", label: "Dram (dr)" },
    { value: "fathom", label: "Fathom" },
    { value: "league", label: "League" },
    { value: "mile", label: "Mile (mi)" },
    { value: "yard", label: "Yard (yd)" },
    { value: "foot", label: "Foot (ft)" },
    { value: "inch", label: "Inch (in)" },
    { value: "angstrom", label: "Angstrom (Å)" },
    { value: "parsec", label: "Parsec (pc)" },
    { value: "lightyear", label: "Lightyear (ly)" },
    { value: "nauticalmile", label: "Nautical Mile (NM)" },
    { value: "acre", label: "Acre" },
    { value: "hectare", label: "Hectare (ha)" },
    { value: "sqm", label: "Square Meter (m²)" },
    { value: "sqft", label: "Square Foot (ft²)" },
    { value: "sqin", label: "Square Inch (in²)" },
    { value: "sqyd", label: "Square Yard (yd²)" },
    { value: "sqkm", label: "Square Kilometer (km²)" },
    { value: "sqmi", label: "Square Mile (mi²)" },
    { value: "cm", label: "Centimeter (cm)" },
    { value: "m", label: "Meter (m)" },
    { value: "mm", label: "Millimeter (mm)" },
    { value: "nm", label: "Nanometer (nm)" },
    { value: "pm", label: "Picometer (pm)" },
    { value: "fm", label: "Femtometer (fm)" },
    { value: "am", label: "Attometer (am)" },
    { value: "l", label: "Liter (L)" },
    { value: "ml", label: "Milliliter (ml)" },
    { value: "kl", label: "Kiloliter (kL)" },
    { value: "cl", label: "Centiliter (cL)" },
    { value: "dl", label: "Deciliter (dL)" },
    { value: "nl", label: "Nanoliter (nL)" },
    { value: "pl", label: "Picoliter (pL)" },
    { value: "fl", label: "Femtoliter (fL)" },
    { value: "al", label: "Attoliter (aL)" },
    { value: "mole", label: "Mole (mol)" },
    { value: "eq", label: "Equivalent (eq)" },
    { value: "iu", label: "International Unit (IU)" },
    { value: "cal", label: "Calorie (cal)" },
    { value: "kcal", label: "Kilocalorie (kcal)" },
    { value: "j", label: "Joule (J)" },
    { value: "kj", label: "Kilojoule (kJ)" },
    { value: "w", label: "Watt (W)" },
    { value: "kw", label: "Kilowatt (kW)" },
    { value: "hp", label: "Horsepower (hp)" },
    { value: "v", label: "Volt (V)" },
    { value: "a", label: "Ampere (A)" },
    { value: "ohm", label: "Ohm (Ω)" },
    { value: "s", label: "Siemens (S)" },
    { value: "f", label: "Farad (F)" },
    { value: "h", label: "Henry (H)" },
    { value: "t", label: "Tesla (T)" },
    { value: "wb", label: "Weber (Wb)" },
    { value: "lm", label: "Lumen (lm)" },
    { value: "lx", label: "Lux (lx)" },
    { value: "cd", label: "Candela (cd)" },
    { value: "bq", label: "Becquerel (Bq)" },
    { value: "gy", label: "Gray (Gy)" },
    { value: "sv", label: "Sievert (Sv)" },
    { value: "kat", label: "Katal (kat)" },
    { value: "rad", label: "Radian (rad)" },
    { value: "sr", label: "Steradian (sr)" },
    { value: "deg", label: "Degree (°)" },
    { value: "arcmin", label: "Minute (angle) (′)" },
    { value: "arcsec", label: "Second (angle) (″)" },
    { value: "rev", label: "Revolution" },
    { value: "cycle", label: "Cycle" },
    { value: "hz", label: "Hertz (Hz)" },
    { value: "baud", label: "Baud" },
    { value: "bit", label: "Bit" },
    { value: "byte", label: "Byte" },
    { value: "word", label: "Word" },
    { value: "page", label: "Page" },
    { value: "ream", label: "Ream" },
    { value: "quire", label: "Quire" },
    { value: "gross", label: "Gross" },
    { value: "greatgross", label: "Great Gross" },
    { value: "dozen", label: "Dozen" },
    { value: "bakersdozen", label: "Baker's Dozen" },
    { value: "score", label: "Score" },
    { value: "googol", label: "Googol" },
    { value: "googolplex", label: "Googolplex" },
    { value: "pcs", label: "Pieces" },
    { value: "pkg", label: "Package" },
    { value: "box", label: "Box" },
    { value: "bag", label: "Bag" },
    { value: "bottle", label: "Bottle" },
    { value: "can", label: "Can" },
    { value: "jar", label: "Jar" },
    { value: "pack", label: "Pack" },
    { value: "roll", label: "Roll" },
    { value: "sheet", label: "Sheet" },
    { value: "slice", label: "Slice" },
    { value: "piece", label: "Piece" },
    { value: "set", label: "Set" },
    { value: "bundle", label: "Bundle" },
    { value: "carton", label: "Carton" },
    { value: "tube", label: "Tube" },
    { value: "barrel", label: "Barrel" },
    { value: "drum", label: "Drum" },
    { value: "sack", label: "Sack" },
    { value: "tray", label: "Tray" },
    { value: "stick", label: "Stick" },
    { value: "strip", label: "Strip" },
    { value: "pair", label: "Pair" },
    { value: "unit", label: "Unit" },
  ];
  const [unitSearch, setUnitSearch] = useState("");
  const filteredUnits = useMemo(() =>
    allUnits.filter(u => u.label.toLowerCase().includes(unitSearch.toLowerCase())),
    [unitSearch]
  );

  return (
    <div className="max-w-lg w-full mx-auto">
      <div className="flex items-center justify-between gap-2 px-0 pt-0 pb-2">
        <span className="text-lg font-bold text-zinc-800 dark:text-white tracking-wide">{item ? "Edit" : "Add New"} Inventory Item</span>
        <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={handleClose} className="rounded-full text-zinc-800 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800">
          <X className="h-5 w-5" />
        </Button>
      </div>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-2 px-4 sm:px-6 pb-4 sm:pb-6 pt-2 max-h-[80vh] overflow-y-auto"
        style={{ boxSizing: 'border-box' }}
      >
        {/* Item Name - moved above the grid */}
        <div className="relative mb-1">
          <Input id="name" {...register("name")} className="peer bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-lg font-semibold" />
          <Label className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 transition-all duration-200 pointer-events-none peer-focus:top-2 peer-focus:text-xs peer-focus:text-orange-500 peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-orange-500">Item Name</Label>
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-400 dark:text-zinc-500 pointer-events-none">e.g. Chicken Breast</span>
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
        </div>
        {/* Notes - moved above the grid */}
        <div className="relative mb-1">
          <Label htmlFor="notes" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Notes (Optional)</Label>
          <Textarea id="notes" {...register("notes")} className="peer bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-base py-2 w-full rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition rounded-lg shadow-sm mt-1" />
          <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">e.g. Keep refrigerated</span>
          {errors.notes && <p className="text-red-500 text-xs mt-1">{errors.notes.message}</p>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
          {/* Category */}
          <div className="relative mb-1 flex items-center gap-2">
            <div className="flex-1">
              <Label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1 block">Category</Label>
              <Select onValueChange={(value) => setValue('category', value, { shouldValidate: true })} value={watch('category')}>
                <SelectTrigger className="peer bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <div key={cat.id} className="flex items-center justify-between pr-2 group">
                      <SelectItem value={String(cat.id)}>{cat.name}</SelectItem>
                      <button
                        type="button"
                        className="ml-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={e => {
                          e.stopPropagation();
                          handleDeleteCategory(cat.id);
                        }}
                        aria-label={`Delete ${cat.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-zinc-300 dark:text-zinc-500 text-center mt-1">e.g. Meat, Vegetables</div>
            </div>
            <Button type="button" variant="ghost" size="icon" aria-label="Add Category" onClick={() => setIsCategoryDialogOpen(true)} className="ml-1 mt-6 text-orange-500 hover:bg-orange-100 dark:hover:bg-orange-900">
              <PlusCircle className="h-5 w-5" />
            </Button>
          </div>
          <CreateCategoryDialog isOpen={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen} onSuccess={handleCategoryCreated} />
          {/* Unit */}
          <div className="relative mb-1">
            <Label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1 block">Unit</Label>
            <Select onValueChange={(value) => setValue('unit', value, { shouldValidate: true })} value={watch('unit')}>
              <SelectTrigger className="peer bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500">
                <SelectValue placeholder="Select Unit" />
              </SelectTrigger>
              <SelectContent style={{ maxHeight: 240, overflowY: 'auto', position: 'relative' }}>
                <div className="sticky top-0 z-10 bg-zinc-50 dark:bg-zinc-800 px-2 py-1 border-b border-zinc-200 dark:border-zinc-700">
                  <input
                    type="text"
                    value={unitSearch}
                    onChange={e => setUnitSearch(e.target.value)}
                    placeholder="Search units..."
                    className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 text-sm mb-2"
                    style={{ position: 'relative', zIndex: 2 }}
                  />
                </div>
                {filteredUnits.length === 0 ? (
                  <div className="px-3 py-2 text-zinc-400 text-sm">No units found</div>
                ) : (
                  filteredUnits.map(u => (
                    <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <div className="text-xs text-zinc-300 dark:text-zinc-500 text-center mt-1">e.g. kg, pcs</div>
            {errors.unit && <p className="text-red-500 text-xs mt-1">{errors.unit.message}</p>}
          </div>
          {/* Purchase Price */}
          <div className="relative mb-1">
            <Label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1 block">Purchase Price (per unit)</Label>
            <Input id="purchase_price" type="number" step="0.01" {...register("purchase_price")} className="peer bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500" />
            <div className="text-xs text-zinc-300 dark:text-zinc-500 text-center mt-1">e.g. 250</div>
            <div className="text-xs text-zinc-300 dark:text-zinc-500 text-center mt-1">Enter the cost to purchase one unit of this item.</div>
            {errors.purchase_price && <p className="text-red-500 text-xs mt-1">{errors.purchase_price.message}</p>}
          </div>
          {/* Minimum Threshold */}
          <div className="relative mb-1">
            <Label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1 block">Low Stock Alert Level</Label>
            <Input id="minimum_threshold" type="number" {...register("minimum_threshold")} className="peer bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500" />
            <div className="text-xs text-zinc-300 dark:text-zinc-500 text-center mt-1">e.g. 10</div>
            <div className="text-xs text-zinc-300 dark:text-zinc-500 text-center mt-1">When the stock for this item drops below this number, you'll get a low stock alert.</div>
            {errors.minimum_threshold && <p className="text-red-500 text-xs mt-1">{errors.minimum_threshold.message}</p>}
          </div>
          {/* Supplier */}
          <div className="relative mb-1 flex items-center gap-2">
            <div className="flex-1">
              <Label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1 block">Supplier (Optional)</Label>
              <Select onValueChange={(value) => setValue('supplier', value, { shouldValidate: true })} value={watch('supplier')}>
                <SelectTrigger className="peer bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500">
                  <SelectValue placeholder="Select Supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.filter(sup => !deletedSuppliers.has(sup.id)).map(sup => (
                    <div key={sup.id} className="flex items-center justify-between pr-2 group">
                      <SelectItem value={String(sup.id)}>{sup.name}</SelectItem>
                      <button
                        type="button"
                        className="ml-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={e => {
                          e.stopPropagation();
                          handleDeleteSupplier(sup.id);
                        }}
                        aria-label={`Delete ${sup.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-zinc-300 dark:text-zinc-500 text-center mt-1">e.g. Everest Suppliers</div>
              {errors.supplier && <p className="text-red-500 text-xs mt-1">{errors.supplier.message}</p>}
            </div>
            <Button type="button" variant="ghost" size="icon" aria-label="Add Supplier" onClick={onOpenSupplierDialog} className="ml-1 mt-6 text-orange-500 hover:bg-orange-100 dark:hover:bg-orange-900">
              <PlusCircle className="h-5 w-5" />
            </Button>
          </div>
          {/* Expiry Date */}
          <div className="relative mb-1">
            <Label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1 block">Expiry Date (Optional)</Label>
            <Input id="expiry_date" type="date" {...register("expiry_date")} className="peer bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500" />
            <div className="text-xs text-zinc-300 dark:text-zinc-500 text-center mt-1">e.g. 2024-12-31</div>
            {errors.expiry_date && <p className="text-red-500 text-xs mt-1">{errors.expiry_date.message}</p>}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="submit" disabled={isSubmitting} className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-lg shadow-lg transition-transform transform hover:scale-105 focus:ring-2 focus:ring-orange-400">
            {isSubmitting ? "Saving..." : (item ? "Save Changes" : "Create Item")}
          </Button>
        </div>
      </form>
    </div>
  )
}