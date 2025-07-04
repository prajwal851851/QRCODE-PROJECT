"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tag } from "lucide-react"
import { getApiUrl } from "@/lib/api-service"

const categorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  description: z.string().optional(),
})

type CategoryFormValues = z.infer<typeof categorySchema>

interface CreateCategoryDialogProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onSuccess: (newCategory: any) => void
}

export function CreateCategoryDialog({ isOpen, onOpenChange, onSuccess }: CreateCategoryDialogProps) {
  const { toast } = useToast()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
  })

  const onSubmit = async (data: CategoryFormValues) => {
    try {
      const token = localStorage.getItem("adminAccessToken")
      if (!token) throw new Error("Authentication token not found.")

      const response = await fetch(`${getApiUrl()}/api/inventory/categories/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (errorData.detail && errorData.detail.toLowerCase().includes('already exists')) {
          toast({
            title: "Category already exists",
            description: "This category already exists. Please add a different category.",
            variant: "destructive",
          })
          return;
        }
        throw new Error(errorData.detail || "Failed to create category.")
      }

      const newCategory = await response.json()
      toast({
        title: "Success",
        description: "New category created successfully.",
      })
      reset()
      onSuccess(newCategory)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border-0 w-full max-w-md sm:max-w-lg max-h-[70vh] overflow-y-auto">
        <div className="flex items-center gap-2 px-2 sm:px-6 pt-4 pb-2 rounded-t-2xl bg-gradient-to-r from-orange-400/80 to-orange-600/80 dark:from-orange-700/80 dark:to-orange-900/80">
          <Tag className="h-7 w-7 text-white drop-shadow" />
          <span className="text-lg font-bold text-white tracking-wide">Add New Category</span>
        </div>
        <div className="px-2 sm:px-6 pb-2 sm:pb-4 pt-1">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="relative">
              <Input id="name" {...register("name")} className="peer bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 w-full" placeholder=" " />
              <Label htmlFor="name" className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 transition-all duration-200 pointer-events-none peer-focus:top-2 peer-focus:text-xs peer-focus:text-orange-500 peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-orange-500">Category Name</Label>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Enter the name of the category (e.g. Meat, Vegetables).</span>
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
            <div className="relative">
              <Textarea id="description" {...register("description")} className="peer bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-base py-2 w-full rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition rounded-lg shadow-sm" placeholder=" " />
              <Label htmlFor="description" className="absolute left-4 top-4 text-zinc-400 dark:text-zinc-500 transition-all duration-200 pointer-events-none peer-focus:top-2 peer-focus:text-xs peer-focus:text-orange-500 peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-orange-500">Description (Optional)</Label>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Describe this category (Optional).</span>
              {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
          </div>
            <div className="flex flex-col md:flex-row gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full md:w-auto text-base py-3 bg-slate-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-700 font-semibold rounded-lg shadow-sm transition-transform">Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto text-base py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-lg shadow-lg transition-transform transform hover:scale-105 focus:ring-2 focus:ring-orange-400">
              {isSubmitting ? "Creating..." : "Create"}
            </Button>
            </div>
        </form>
        </div>
      </DialogContent>
    </Dialog>
  )
} 