"use client"

export default function StockInPage() {
  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Stock In Records</h1>
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow p-4 mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="font-semibold">Stock In</span>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">Add Stock In</button>
        </div>
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {/* Stock in rows go here */}
          <div className="flex justify-between items-center py-3">
            <span className="font-medium">Example Stock In</span>
            <div className="flex gap-2">
              <button className="text-blue-600 hover:underline">Edit</button>
              <button className="text-red-600 hover:underline">Delete</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 