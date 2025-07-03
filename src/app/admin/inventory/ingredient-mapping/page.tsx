"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function IngredientMappingPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [form, setForm] = useState({ dish: "", ingredient: "", quantity: "" })

  // Dummy data for now
  const dishes = [
    { id: 1, name: "Pizza" },
    { id: 2, name: "Burger" },
  ]
  const ingredients = [
    { id: 1, name: "Cheese" },
    { id: 2, name: "Tomato" },
  ]

  const handleChange = (e: any) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }
  const handleSubmit = (e: any) => {
    e.preventDefault()
    // TODO: connect to backend
    setIsDialogOpen(false)
    setForm({ dish: "", ingredient: "", quantity: "" })
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Ingredient Mappings</h1>
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow p-4 mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="font-semibold">Mappings</span>
          <Button onClick={() => setIsDialogOpen(true)}>Add Mapping</Button>
        </div>
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {/* Mapping rows go here */}
          <div className="flex justify-between items-center py-3">
            <span className="font-medium">Example Mapping</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">Edit</Button>
              <Button variant="destructive" size="sm">Delete</Button>
            </div>
          </div>
        </div>
      </div>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-full w-full p-4 md:p-8 rounded-2xl shadow-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Ingredient Mapping</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div>
              <Label htmlFor="dish">Dish</Label>
              <select id="dish" name="dish" value={form.dish} onChange={handleChange} required className="w-full border rounded px-3 py-2 text-base">
                <option value="">---------</option>
                {dishes.map(dish => <option key={dish.id} value={dish.id}>{dish.name}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="ingredient">Ingredient</Label>
              <select id="ingredient" name="ingredient" value={form.ingredient} onChange={handleChange} required className="w-full border rounded px-3 py-2 text-base">
                <option value="">---------</option>
                {ingredients.map(ing => <option key={ing.id} value={ing.id}>{ing.name}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input id="quantity" name="quantity" value={form.quantity} onChange={handleChange} required type="number" min="0.001" step="0.001" className="text-base py-3" />
            </div>
            <DialogFooter className="flex flex-col md:flex-row gap-2 mt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full md:w-auto text-base py-3">Cancel</Button>
              <Button type="submit" className="w-full md:w-auto text-base py-3">Add Mapping</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
} 