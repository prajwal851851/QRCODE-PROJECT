"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import type { InventoryItem, Supplier } from "@/lib/types"
import { getApiUrl } from "@/lib/api-service"

const stockInSchema = z.object({
  item: z.string({ required_error: "Please select an item." }),
  quantity: z.coerce.number().min(0.001, "Quantity must be positive."),
  date: z.string().nonempty("Date is required."),
  supplier: z.string().optional(),
  unit_price: z.coerce.number().optional(),
  invoice_id: z.string().optional(),
})

type StockInFormValues = z.infer<typeof stockInSchema>

interface StockInFormProps {
  items: InventoryItem[]
  suppliers: Supplier[]
  onSuccess: () => void
  onCancel: () => void
}

export function StockInForm({ items, suppliers, onSuccess, onCancel }: StockInFormProps) {
  const { toast } = useToast()
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<StockInFormValues>({
    resolver: zodResolver(stockInSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0] // Today's date
    }
  })

  const onSubmit = async (data: StockInFormValues) => {
    try {
      const token = localStorage.getItem("adminAccessToken")
      // Transform payload for DRF: use item_id and supplier_id
      const payload: any = { ...data, item_id: data.item };
      delete payload.item;
      if (data.supplier) {
        payload.supplier_id = data.supplier;
        delete payload.supplier;
      }
      const response = await fetch(`${getApiUrl()}/api/inventory/stock-ins/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(Object.values(errorData).flat().join(' ') || "Failed to add stock.")
      }
      toast({ title: "Success", description: "Stock added successfully." })
      onSuccess()
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "An unexpected error occurred.", variant: "destructive" })
    }
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border-0 max-w-lg w-full mx-auto">
      <div className="flex items-center gap-2 px-6 pt-6 pb-2 rounded-t-2xl bg-gradient-to-r from-orange-400/80 to-orange-600/80 dark:from-orange-700/80 dark:to-orange-900/80">
        <span className="text-lg font-bold text-white tracking-wide">Stock In</span>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 px-4 sm:px-6 pb-4 sm:pb-6 pt-2 max-h-[80vh] overflow-y-auto">
        <div className="relative">
          <Select onValueChange={(value) => setValue('item', value)} value={watch('item')}>
            <SelectTrigger className="peer bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500">
              <SelectValue placeholder="" />
            </SelectTrigger>
            <Label className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 transition-all duration-200 pointer-events-none peer-focus:top-2 peer-focus:text-xs peer-focus:text-orange-500 peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-orange-500">Item</Label>
            <SelectContent>
              {items.map(it => <SelectItem key={it.id} value={String(it.id)}>{it.name} ({it.unit})</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Select the inventory item you are adding stock for.</span>
          {errors.item && <p className="text-red-500 text-xs mt-1">{errors.item.message}</p>}
        </div>
        <div className="relative">
          <Input id="quantity" type="number" step="0.01" {...register("quantity")} className="peer bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500" placeholder="" />
          <Label className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 transition-all duration-200 pointer-events-none peer-focus:top-2 peer-focus:text-xs peer-focus:text-orange-500 peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-orange-500">Quantity</Label>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Enter the amount of stock you are adding (in the item's unit).</span>
          {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity.message}</p>}
        </div>
        <div className="relative">
          <Input id="date" type="date" {...register("date")} className="peer bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500" placeholder="" />
          <Label className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 transition-all duration-200 pointer-events-none peer-focus:top-2 peer-focus:text-xs peer-focus:text-orange-500 peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-orange-500">Date</Label>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Choose the date when the stock was added.</span>
          {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>}
        </div>
        <div className="relative">
          <Select onValueChange={(value) => setValue('supplier', value)} value={watch('supplier')}>
            <SelectTrigger className="peer bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500">
              <SelectValue placeholder="" />
            </SelectTrigger>
            <Label className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 transition-all duration-200 pointer-events-none peer-focus:top-2 peer-focus:text-xs peer-focus:text-orange-500 peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-orange-500">Supplier (optional)</Label>
            <SelectContent>
              {suppliers.map(sup => <SelectItem key={sup.id} value={String(sup.id)}>{sup.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Select the supplier from whom you purchased the stock (optional).</span>
        </div>
        <div className="relative">
          <Input id="unit_price" type="number" step="0.01" {...register("unit_price")} className="peer bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500" placeholder="" />
          <Label className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 transition-all duration-200 pointer-events-none peer-focus:top-2 peer-focus:text-xs peer-focus:text-orange-500 peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-orange-500">Unit Price</Label>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Enter the price per unit for this stock entry (optional).</span>
        </div>
        <div className="relative">
          <Input id="invoice_id" {...register("invoice_id")} className="peer bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500" placeholder="" />
          <Label className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 transition-all duration-200 pointer-events-none peer-focus:top-2 peer-focus:text-xs peer-focus:text-orange-500 peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-orange-500">Invoice ID</Label>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Enter the invoice or bill number for this stock entry (optional).</span>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel} className="bg-slate-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-700 font-semibold rounded-lg shadow-sm transition-transform">Cancel</Button>
          <Button type="submit" disabled={isSubmitting} className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-lg shadow-lg transition-transform transform hover:scale-105 focus:ring-2 focus:ring-orange-400">{isSubmitting ? "Saving..." : "Add Stock"}</Button>
        </div>
      </form>
    </div>
  )
} 