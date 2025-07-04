"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { X, User, Mail, Phone, MapPin, FileText } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

const supplierSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  contact_person: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
})

type SupplierFormValues = z.infer<typeof supplierSchema>

interface CreateSupplierDialogProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onSuccess: (newSupplier: any) => void
}

export function CreateSupplierDialog({ isOpen, onOpenChange, onSuccess }: CreateSupplierDialogProps) {
  const { toast } = useToast()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
  })

  const fieldVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } }
  }

  const iconClass = "absolute left-3 top-3 h-5 w-5 text-zinc-400"
  const inputClass = "pl-10 bg-zinc-50 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-base py-3 w-full rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"

  const onSubmit = async (data: SupplierFormValues) => {
    try {
      const token = localStorage.getItem("adminAccessToken")
      if (!token) throw new Error("Authentication token not found.")

      const response = await fetch(`${getApiUrl()}/api/inventory/suppliers/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Failed to create supplier.")
      }

      const newSupplier = await response.json()
      toast({
        title: "Success",
        description: "New supplier created successfully.",
      })
      reset()
      onSuccess(newSupplier)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border-0 w-full max-w-md sm:max-w-lg max-h-[70vh] overflow-y-auto mx-auto p-0">
      <div className="flex items-center gap-2 px-2 sm:px-6 pt-4 pb-2 rounded-t-2xl bg-gradient-to-r from-orange-400/80 to-orange-600/80 dark:from-orange-700/80 dark:to-orange-900/80">
        <User className="h-7 w-7 text-white drop-shadow" />
        <span className="text-lg font-bold text-white tracking-wide">Add New Supplier</span>
      </div>
      <div className="px-2 sm:px-6 pb-2 sm:pb-4 pt-1">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="relative">
            <Input id="name" {...register("name")} className="peer bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 w-full" placeholder=" " />
            <Label htmlFor="name" className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 transition-all duration-200 pointer-events-none peer-focus:top-2 peer-focus:text-xs peer-focus:text-orange-500 peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-orange-500">Supplier Name</Label>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Enter the full name of the supplier company or person.</span>
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div className="relative">
            <Input id="contact_person" {...register("contact_person")} className="peer bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 w-full" placeholder=" " />
            <Label htmlFor="contact_person" className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 transition-all duration-200 pointer-events-none peer-focus:top-2 peer-focus:text-xs peer-focus:text-orange-500 peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-orange-500">Contact Person</Label>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Who should we contact at this supplier? (Optional)</span>
            {errors.contact_person && <p className="text-red-500 text-xs mt-1">{errors.contact_person.message}</p>}
          </div>
          <div className="relative">
            <Input id="email" type="email" {...register("email")} className="peer bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 w-full" placeholder=" " />
            <Label htmlFor="email" className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 transition-all duration-200 pointer-events-none peer-focus:top-2 peer-focus:text-xs peer-focus:text-orange-500 peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-orange-500">Email</Label>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Supplier's email address (Optional).</span>
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>
          <div className="relative">
            <Input id="phone" {...register("phone")} className="peer bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 w-full" placeholder=" " />
            <Label htmlFor="phone" className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 transition-all duration-200 pointer-events-none peer-focus:top-2 peer-focus:text-xs peer-focus:text-orange-500 peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-orange-500">Phone</Label>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Supplier's phone number (Optional).</span>
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
          </div>
          <div className="relative">
            <Textarea id="address" {...register("address")} className="peer bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-base py-2 w-full rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition rounded-lg shadow-sm" placeholder=" " />
            <Label htmlFor="address" className="absolute left-4 top-4 text-zinc-400 dark:text-zinc-500 transition-all duration-200 pointer-events-none peer-focus:top-2 peer-focus:text-xs peer-focus:text-orange-500 peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-orange-500">Address</Label>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Supplier's address (Optional).</span>
            {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>}
          </div>
          <div className="relative">
            <Textarea id="notes" {...register("notes")} className="peer bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-base py-2 w-full rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition rounded-lg shadow-sm" placeholder=" " />
            <Label htmlFor="notes" className="absolute left-4 top-4 text-zinc-400 dark:text-zinc-500 transition-all duration-200 pointer-events-none peer-focus:top-2 peer-focus:text-xs peer-focus:text-orange-500 peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-orange-500">Notes</Label>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Any additional notes about this supplier (Optional).</span>
            {errors.notes && <p className="text-red-500 text-xs mt-1">{errors.notes.message}</p>}
          </div>
          <div className="flex flex-col md:flex-row gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full md:w-auto text-base py-3 bg-slate-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-700 font-semibold rounded-lg shadow-sm transition-transform">Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto text-base py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-lg shadow-lg transition-transform transform hover:scale-105 focus:ring-2 focus:ring-orange-400">
              {isSubmitting ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
} 