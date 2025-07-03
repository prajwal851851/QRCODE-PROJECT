/*"use client"

import { useState } from "react"
import { AdminHeader } from "@/components/admin-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { tables as initialTables } from "@/lib/dummy-data"
import type { Table } from "@/lib/types"
import { Plus, Edit, Trash2, QrCode, Download } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { QRCodeGenerator } from "@/components/qr-code-generator"

export default function TableManagementPage() {
  const [tables, setTables] = useState<Table[]>(initialTables)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false)
  const [currentTable, setCurrentTable] = useState<Table | null>(null)
  const [newTable, setNewTable] = useState<Partial<Table>>({
    number: tables.length > 0 ? Math.max(...tables.map((t) => t.number)) + 1 : 1,
    capacity: 2,
    status: "available",
    location: "Main Floor",
  })

  const { toast } = useToast()

  const baseUrl =
    typeof window !== "undefined" ? `${window.location.origin}` : "https://yourdomain.com"

  const handleAddTable = () => {
    const id = (Math.max(...tables.map((table) => Number.parseInt(table.id))) + 1).toString()
    const tableToAdd = {
      ...newTable,
      id,
      number: Number(newTable.number),
      capacity: Number(newTable.capacity),
      qrCode: `${baseUrl}/menu?tableNumber=${newTable.number}`,
    } as Table

    setTables([...tables, tableToAdd])
    setIsAddDialogOpen(false)
    setNewTable({
      number: Math.max(...[...tables, tableToAdd].map((t) => t.number)) + 1,
      capacity: 2,
      status: "available",
      location: "Main Floor",
    })

    toast({
      title: "Table Added",
      description: `Table ${tableToAdd.number} has been added.`,
    })
  }

  const handleEditTable = () => {
    if (!currentTable) return

    const updatedTables = tables.map((table) => (table.id === currentTable.id ? currentTable : table))

    setTables(updatedTables)
    setIsEditDialogOpen(false)
    setCurrentTable(null)

    toast({
      title: "Table Updated",
      description: `Table ${currentTable.number} has been updated.`,
    })
  }

  const handleDeleteTable = () => {
    if (!currentTable) return

    const updatedTables = tables.filter((table) => table.id !== currentTable.id)
    setTables(updatedTables)
    setIsDeleteDialogOpen(false)

    toast({
      title: "Table Deleted",
      description: `Table ${currentTable.number} has been removed.`,
    })

    setCurrentTable(null)
  }

  const handleDownloadQRCode = async () => {
    if (!currentTable) return

    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
        `${baseUrl}/menu?tableNumber=${currentTable.number}`
      )}&margin=10`
      const response = await fetch(qrUrl)
      const blob = await response.blob()
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.download = `table-${currentTable.number}-qrcode.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "QR Code Downloaded",
        description: `QR code for Table ${currentTable.number} has been downloaded.`,
      })
    } catch (error) {
      console.error("Error downloading QR code:", error)
      toast({
        title: "Download Failed",
        description: "There was an error downloading the QR code.",
        variant: "destructive",
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800"
      case "occupied":
        return "bg-red-100 text-red-800"
      case "reserved":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <>
      <AdminHeader title="Table Management" />
      <main className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Restaurant Tables</h1>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Table
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tables.map((table) => (
            <Card key={table.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex justify-between items-center">
                  <span>Table {table.number}</span>
                  <div className={`px-2 py-1 rounded-full text-xs ${getStatusColor(table.status)}`}>
                    {table.status.charAt(0).toUpperCase() + table.status.slice(1)}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Capacity:</span>
                    <span>{table.capacity} people</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Location:</span>
                    <span>{table.location}</span>
                  </div>
                  {table.status === "reserved" && table.reservationDetails && (
                    <div className="pt-2 border-t text-sm">
                      <p className="font-medium">Reserved for:</p>
                      <p>{table.reservationDetails.name}</p>
                      <p>
                        {new Date(table.reservationDetails.time).toLocaleString("en-US", {
                          year: "numeric",
                          month: "numeric",
                          day: "numeric",
                          hour: "numeric",
                          minute: "numeric",
                          second: "numeric",
                          hour12: true,
                        })}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCurrentTable(table)
                      setIsQrDialogOpen(true)
                    }}
                  >
                    <QrCode className="mr-2 h-4 w-4" />
                    QR Code
                  </Button>
                  <div className="space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setCurrentTable(table)
                        setIsEditDialogOpen(true)
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setCurrentTable(table)
                        setIsDeleteDialogOpen(true)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      {/* Add Table Dialog *//*
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Table</DialogTitle>
            <DialogDescription>Add a new table to your restaurant.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="table-number" className="text-right">
                Number
              </Label>
              <Input
                id="table-number"
                type="number"
                value={newTable.number}
                onChange={(e) => setNewTable({ ...newTable, number: Number.parseInt(e.target.value) })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="capacity" className="text-right">
                Capacity
              </Label>
              <Input
                id="capacity"
                type="number"
                value={newTable.capacity}
                onChange={(e) => setNewTable({ ...newTable, capacity: Number.parseInt(e.target.value) })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="location" className="text-right">
                Location
              </Label>
              <Input
                id="location"
                value={newTable.location}
                onChange={(e) => setNewTable({ ...newTable, location: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <Select
                value={newTable.status as string}
                onValueChange={(value) => setNewTable({ ...newTable, status: value as any })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTable}>Add Table</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Table Dialog *
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Table</DialogTitle>
            <DialogDescription>Make changes to the table.</DialogDescription>
          </DialogHeader>
          {currentTable && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-table-number" className="text-right">
                  Number
                </Label>
                <Input
                  id="edit-table-number"
                  type="number"
                  value={currentTable.number}
                  onChange={(e) => setCurrentTable({ ...currentTable, number: Number.parseInt(e.target.value) })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-capacity" className="text-right">
                  Capacity
                </Label>
                <Input
                  id="edit-capacity"
                  type="number"
                  value={currentTable.capacity}
                  onChange={(e) => setCurrentTable({ ...currentTable, capacity: Number.parseInt(e.target.value) })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-location" className="text-right">
                  Location
                </Label>
                <Input
                  id="edit-location"
                  value={currentTable.location}
                  onChange={(e) => setCurrentTable({ ...currentTable, location: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-status" className="text-right">
                  Status
                </Label>
                <Select
                  value={currentTable.status}
                  onValueChange={(value) => setCurrentTable({ ...currentTable, status: value as any })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="occupied">Occupied</SelectItem>
                    <SelectItem value="reserved">Reserved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditTable}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog *      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Table</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this table? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {currentTable && (
            <div className="py-4">
              <p className="font-medium">Table {currentTable.number}</p>
              <p className="text-sm text-muted-foreground">Capacity: {currentTable.capacity} people</p>
              <p className="text-sm text-muted-foreground">Location: {currentTable.location}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTable}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog *
      <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Table QR Code</DialogTitle>
            <DialogDescription>Scan this QR code to access the digital menu for this table.</DialogDescription>
          </DialogHeader>
          {currentTable && (
            <div className="py-4 flex flex-col items-center">
              <div className="bg-white p-4 rounded-lg mb-4">
                <QRCodeGenerator
                  value={`${baseUrl}/menu?tableNumber=${currentTable.number}`}
                  size={200}
                  includeTableInfo={true}
                  includeRestaurantLogo={true}
                  tableInfo={{
                    id: Number(currentTable.id),
                    name: `Table ${currentTable.number}`,
                    section: currentTable.location ?? "",
                    size: currentTable.capacity,
                    active: true,
                  }}
                />
                <div className="mt-2 text-center">
                  <p className="text-xs text-gray-500 break-all">
                    URL: {`${baseUrl}/menu?tableNumber=${currentTable.number}`}
                  </p>
                </div>
              </div>
              <p className="text-center font-medium">Table {currentTable.number}</p>
              <p className="text-center text-sm text-muted-foreground">
                {currentTable.location} • {currentTable.capacity} people
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsQrDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={handleDownloadQRCode}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}*/