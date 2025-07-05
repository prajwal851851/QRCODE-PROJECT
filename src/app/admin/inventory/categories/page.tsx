"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { getApiUrl } from '@/lib/api-service';

interface Category {
  id: number
  name: string
  description: string
}

export default function InventoryCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [form, setForm] = useState({ name: "", description: "" })
  const { toast } = useToast()

  const fetchCategories = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem("adminAccessToken")
      const res = await fetch(`${getApiUrl()}/api/inventory/categories/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Failed to fetch categories")
      const data = await res.json()
      setCategories(data)
    } catch (err: any) {
      setError(err.message || "Error loading categories")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const openAdd = () => {
    setEditingCategory(null)
    setForm({ name: "", description: "" })
    setIsDialogOpen(true)
  }
  const openEdit = (cat: Category) => {
    setEditingCategory(cat)
    setForm({ name: cat.name, description: cat.description })
    setIsDialogOpen(true)
  }
  const closeDialog = () => {
    setIsDialogOpen(false)
    setEditingCategory(null)
    setForm({ name: "", description: "" })
  }
  const handleChange = (e: any) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }
  const handleSubmit = async (e: any) => {
    e.preventDefault()
    const token = localStorage.getItem("adminAccessToken")
    try {
      const res = await fetch(
        editingCategory
          ? `${getApiUrl()}/api/inventory/categories/${editingCategory.id}/`
          : `${getApiUrl()}/api/inventory/categories/`,
        {
          method: editingCategory ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(form),
        }
      )
      if (!res.ok) throw new Error("Failed to save category")
      toast({ title: "Success", description: `Category ${editingCategory ? "updated" : "created"}` })
      closeDialog()
      fetchCategories()
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    }
  }
  const handleDelete = async (cat: Category) => {
    if (!window.confirm(`Delete category "${cat.name}"?`)) return
    const token = localStorage.getItem("adminAccessToken")
    try {
      const res = await fetch(`${getApiUrl()}/api/inventory/categories/${cat.id}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Failed to delete category")
      toast({ title: "Deleted", description: "Category deleted" })
      fetchCategories()
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Inventory Categories</h1>
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow p-4 mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="font-semibold">Categories</span>
          <Button onClick={openAdd}>Add Category</Button>
        </div>
        {loading ? (
          <div className="py-8 text-center text-zinc-500">Loading...</div>
        ) : error ? (
          <div className="py-8 text-center text-red-500">{error}</div>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {categories.length === 0 && <div className="py-8 text-center text-zinc-400">No categories found.</div>}
            {categories.map(cat => (
              <div key={cat.id} className="flex justify-between items-center py-3">
                <div>
                  <div className="font-medium">{cat.name}</div>
                  {cat.description && <div className="text-zinc-500 text-sm">{cat.description}</div>}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(cat)}>Edit</Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(cat)}>Delete</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-full w-full p-4 md:p-8 rounded-2xl shadow-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Add Category"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" value={form.name} onChange={handleChange} required className="text-base py-3" />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" value={form.description} onChange={handleChange} className="text-base py-3" />
            </div>
            <DialogFooter className="flex flex-col md:flex-row gap-2 mt-4">
              <Button type="button" variant="outline" onClick={closeDialog} className="w-full md:w-auto text-base py-3">Cancel</Button>
              <Button type="submit" className="w-full md:w-auto text-base py-3">{editingCategory ? "Save Changes" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}