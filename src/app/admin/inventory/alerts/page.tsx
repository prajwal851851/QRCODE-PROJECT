"use client"

export default function InventoryAlertsPage() {
  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Inventory Alerts</h1>
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow p-4 mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="font-semibold">Alerts</span>
          <select className="border rounded px-2 py-1">
            <option value="">All Types</option>
            <option value="low_stock">Low Stock</option>
            <option value="expiry">Expiring Soon</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
        </div>
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {/* Alert rows go here */}
          <div className="flex justify-between items-center py-3">
            <span className="font-medium">Example Alert</span>
            <div className="flex gap-2">
              <button className="text-green-600 hover:underline">Mark as Read</button>
              <button className="text-yellow-600 hover:underline">Mark as Unread</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 