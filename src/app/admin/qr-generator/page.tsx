"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { UtensilsCrossed, Plus, Trash, Download, Printer, CheckSquare, Square, Loader2, RefreshCw } from "lucide-react"
import Link from "next/link"
import { QRCodeGenerator } from "@/components/qr-code-generator"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { AdminHeader } from "@/components/admin-header"
import { tables } from "@/lib/dummy-data"
import { fetchWithAuth, getApiUrl } from '@/lib/api-service'
import styles from '../dashboard/dashboard.module.css'
import { useLoading } from '@/contexts/LoadingContext'

interface Table {
  id: number
  name: string
  section: string
  size: number
  active: boolean
  created_at: string
  updated_at: string
  qr_code_url: string
  public_id: string
}

const baseUrl = typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_FRONTEND_URL || "https://dynamic-creponne-83f334.netlify.app";

export default function QRGeneratorPage() {
  const { setShow } = useLoading();
  useEffect(() => { setShow(false); }, [setShow]);
  const [tables, setTables] = useState<Table[]>([])
  const [selectedTable, setSelectedTable] = useState<number | null>(null)
  const [newTable, setNewTable] = useState({ name: "", section: "Main Dining", size: 2 })
  const [qrCodeSize, setQrCodeSize] = useState(200)
  const [includeTableInfo, setIncludeTableInfo] = useState<boolean>(true)
  const [includeRestaurantLogo, setIncludeRestaurantLogo] = useState(true)
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [selectedTables, setSelectedTables] = useState<number[]>([])
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchTables()
  }, [])

  const fetchTables = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetchWithAuth(getApiUrl() + "/api/tables/", {
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
      })

      if (!response.ok) {
        const contentType = response.headers.get("content-type")
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json()
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
        } else {
          const errorText = await response.text()
          console.error("Non-JSON response:", errorText)
          throw new Error(`Unexpected response: ${response.statusText}`)
        }
      }

      const data = await response.json()
      // Sort tables numerically by their name
      const sortedData = data.sort((a: Table, b: Table) => {
        const numA = parseInt(a.name.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.name.replace(/\D/g, '')) || 0;
        return numA - numB;
      });
      setTables(sortedData)
      if (sortedData.length > 0 && selectedTable === null) {
        setSelectedTable(sortedData[0].id)
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Error fetching tables:", errMsg)
      setError(errMsg || "Failed to load tables. Please check the server connection.")
      toast({
        title: "Error",
        description: errMsg || "Failed to load tables.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const sections = [...new Set(tables.map((table) => table.section))]
  const filteredTables = selectedSection ? tables.filter((table) => table.section === selectedSection) : tables

  const handleAddTable = async () => {
    if (!newTable.name.trim()) {
      toast({
        title: "Error",
        description: "Table name is required.",
        variant: "destructive",
      })
      return
    }
    try {
      const response = await fetchWithAuth(getApiUrl() + "/api/tables/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTable.name,
          section: newTable.section,
          size: newTable.size,
          active: true,
        }),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to add table")
      }
      const newTableData = await response.json()
      setTables([...tables, newTableData])
      setNewTable({ name: "", section: "Main Dining", size: 2 })
      toast({
        title: "Table Added",
        description: `${newTable.name} has been added successfully.`,
      })
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Error adding table:", errMsg)
      toast({
        title: "Error",
        description: errMsg || "Failed to add table.",
        variant: "destructive",
      })
    }
  }

  const toggleTableStatus = async (id: number) => {
    const table = tables.find((t) => t.id === id)
    if (!table) return
    try {
      const response = await fetchWithAuth(getApiUrl() + "/api/tables/" + id + "/", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !table.active }),
      })
      if (!response.ok) throw new Error("Failed to update table status")
      setTables(tables.map((t) => (t.id === id ? { ...t, active: !t.active } : t)))
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Error updating table status:", errMsg)
      toast({
        title: "Error",
        description: "Failed to update table status.",
        variant: "destructive",
      })
    }
  }

  const deleteTable = async (id: number) => {
    try {
      const response = await fetchWithAuth(getApiUrl() + "/api/tables/" + id + "/", {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Failed to delete table")
      setTables(tables.filter((table) => table.id !== id))
      if (selectedTable === id) setSelectedTable(null)
      setSelectedTables(selectedTables.filter((tableId) => tableId !== id))
      toast({
        title: "Table Deleted",
        description: "The table has been removed successfully.",
      })
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Error deleting table:", errMsg)
      toast({
        title: "Error",
        description: errMsg || "Failed to delete table.",
        variant: "destructive",
      })
    }
  }

  const toggleTableSelection = (id: number) => {
    setSelectedTables((prev) => (prev.includes(id) ? prev.filter((tableId) => tableId !== id) : [...prev, id]))
  }

  const selectAllTables = () => {
    if (selectedTables.length === filteredTables.length) {
      setSelectedTables([])
    } else {
      setSelectedTables(filteredTables.map((table) => table.id))
    }
  }

  const downloadMultipleQRCodes = async () => {
    if (selectedTables.length === 0) {
      toast({
        title: "No Tables Selected",
        description: "Please select at least one table to download QR codes.",
        variant: "destructive",
      })
      return
    }

    setIsDownloading(true)
    setDownloadProgress(0)

    try {
      const JSZip = (await import("jszip")).default
      const zip = new JSZip()
      const folder = zip.folder("qr-codes")

      const tablesToDownload = tables.filter((table) => selectedTables.includes(table.id))
      const total = tablesToDownload.length
      let completed = 0

      const fetchQRCode = async (table: Table) => {
        const qrUrl = `${baseUrl}/menu?tableUid=${table.public_id}`
        const qrResponse = await fetch(
          `https://api.qrserver.com/v1/create-qr-code/?size=${qrCodeSize}x${qrCodeSize}&data=${encodeURIComponent(
            qrUrl
          )}&margin=10`
        )
        if (!qrResponse.ok) throw new Error(`Failed to fetch QR code image for ${table.name}`)
        const blob = await qrResponse.blob()
        folder?.file(`${table.name.replace(/\s+/g, "-")}-qrcode.png`, blob)
        completed++
        setDownloadProgress(Math.round((completed / total) * 100))
      }

      const batchSize = 3
      for (let i = 0; i < tablesToDownload.length; i += batchSize) {
        const batch = tablesToDownload.slice(i, i + batchSize)
        await Promise.all(batch.map((table) => fetchQRCode(table)))
      }

      const content = await zip.generateAsync({ type: "blob" })
      const link = document.createElement("a")
      link.href = URL.createObjectURL(content)
      link.download = "table-qr-codes.zip"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "QR Codes Downloaded",
        description: `Successfully downloaded ${tablesToDownload.length} QR codes.`,
      })
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Error downloading multiple QR codes:", errMsg)
      toast({
        title: "Download Failed",
        description: errMsg || "There was an error downloading the QR codes.",
        variant: "destructive",
      })
    } finally {
      setIsDownloading(false)
      setDownloadProgress(0)
    }
  }

  const printMultipleQRCodes = async () => {
    if (selectedTables.length === 0) {
      toast({
        title: "No Tables Selected",
        description: "Please select at least one table to print QR codes.",
        variant: "destructive",
      })
      return
    }
    try {
      const tablesToPrint = tables.filter((table) => selectedTables.includes(table.id))
      const qrCodes: { name: string; url: string }[] = []
      for (const table of tablesToPrint) {
        const qrUrl = `${baseUrl}/menu?tableUid=${table.public_id}`
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrCodeSize}x${qrCodeSize}&data=${encodeURIComponent(qrUrl)}&margin=10`
        qrCodes.push({ name: table.name, url: qrCodeUrl })
      }
      const printWindow = window.open("", "_blank")
      if (!printWindow) {
        toast({
          title: "Print Failed",
          description: "Unable to open print window. Please check your popup settings.",
          variant: "destructive",
        })
        return
      }
      printWindow.document.write(`
        <html>
          <head>
            <title>Print QR Codes</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              .qr-list { display: flex; flex-wrap: wrap; gap: 24px; }
              .qr-item { width: 220px; text-align: center; margin-bottom: 24px; }
              img { max-width: 200px; height: auto; }
              .table-name { margin-top: 8px; font-weight: bold; }
              @media print { @page { margin: 0.5cm; } }
            </style>
          </head>
          <body>
            <div class="qr-list">
              ${qrCodes
                .map(
                  (qr) =>
                    `<div class="qr-item">
                      <img src="${qr.url}" alt="QR Code for ${qr.name}" />
                      <div class="table-name">${qr.name}</div>
                    </div>`
                )
                .join("")}
            </div>
            <script>
              setTimeout(() => { window.print(); window.close(); }, 1000);
            </script>
          </body>
        </html>
      `)
      printWindow.document.close()
      toast({
        title: "Printing QR Codes",
        description: "The print dialog should open shortly.",
      })
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Error printing multiple QR codes:", errMsg)
      toast({
        title: "Print Failed",
        description: errMsg || "There was an error printing the QR codes.",
        variant: "destructive",
      })
    }
  }

  const getCustomerMenuUrl = (table: Table) =>
    table && table.public_id ? `${baseUrl}/menu?tableUid=${table.public_id}` : "";

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <RefreshCw className="h-10 w-10 text-orange-500 animate-spin mb-4" />
        <p className="text-lg font-semibold">Please wait…</p>
        <p className="text-sm text-gray-500">Loading section, this may take a few seconds.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 bg-background text-foreground px-2 sm:px-6 py-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:w-auto">
          <h2 className="text-3xl font-bold tracking-tight">Table QR Codes</h2>
          <p className="text-muted-foreground">
              {tables.filter((t) => t.active).length} Active Tables
          </p>
          </div>
        <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/admin/dashboard">Back to Dashboard</Link>
          </Button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          <Button variant="outline" size="sm" className="ml-4 mt-2 sm:mt-0" onClick={fetchTables}>
              Retry
            </Button>
          </div>
        )}

        {!isLoading && !error && (
        <div className="grid lg:grid-cols-[1fr_400px] gap-8">
              <div>
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Tables</CardTitle>
                    <CardDescription>Manage your restaurant tables and generate QR codes</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Button
                        variant={selectedSection === null ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedSection(null)}
                        className={selectedSection === null ? "bg-orange-600 hover:bg-orange-700" : ""}
                      >
                    All Sections
                      </Button>
                      {sections.map((section) => (
                        <Button
                          key={section}
                          variant={selectedSection === section ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedSection(section)}
                          className={selectedSection === section ? "bg-orange-600 hover:bg-orange-700" : ""}
                        >
                          {section}
                        </Button>
                      ))}
                    </div>

                <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                        <Button variant="ghost" size="sm" className="flex items-center gap-2" onClick={selectAllTables}>
                          {selectedTables.length === filteredTables.length && filteredTables.length > 0 ? (
                            <CheckSquare className="h-4 w-4" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                          {selectedTables.length > 0 ? `Selected (${selectedTables.length})` : "Select All"}
                        </Button>
                  <div className="flex gap-2 w-full sm:w-auto">
                        <Button
                          variant="outline"
                          size="sm"
                      disabled={isDownloading || filteredTables.length === 0}
                      onClick={async () => {
                        setIsDownloading(true)
                        setDownloadProgress(0)
                        try {
                          const JSZip = (await import("jszip")).default
                          const zip = new JSZip()
                          const folder = zip.folder("qr-codes")
                          const total = filteredTables.length
                          let completed = 0
                          const fetchQRCode = async (table: Table) => {
                            const qrUrl = `${baseUrl}/menu?tableUid=${table.public_id}`
                            const qrResponse = await fetch(
                              `https://api.qrserver.com/v1/create-qr-code/?size=${qrCodeSize}x${qrCodeSize}&data=${encodeURIComponent(qrUrl)}&margin=10`
                            )
                            if (!qrResponse.ok) throw new Error(`Failed to fetch QR code image for ${table.name}`)
                            const blob = await qrResponse.blob()
                            folder?.file(`${table.name.replace(/\s+/g, "-")}-qrcode.png`, blob)
                            completed++
                            setDownloadProgress(Math.round((completed / total) * 100))
                          }
                          const batchSize = 3
                          for (let i = 0; i < filteredTables.length; i += batchSize) {
                            const batch = filteredTables.slice(i, i + batchSize)
                            await Promise.all(batch.map((table) => fetchQRCode(table)))
                          }
                          const content = await zip.generateAsync({ type: "blob" })
                          const link = document.createElement("a")
                          link.href = URL.createObjectURL(content)
                          link.download = "table-qr-codes.zip"
                          document.body.appendChild(link)
                          link.click()
                          document.body.removeChild(link)
                          toast({
                            title: "QR Codes Downloaded",
                            description: `Successfully downloaded ${filteredTables.length} QR codes.`,
                          })
                        } catch (error) {
                          const errMsg = error instanceof Error ? error.message : String(error);
                          toast({
                            title: "Download Failed",
                            description: errMsg || "There was an error downloading the QR codes.",
                            variant: "destructive",
                          })
                        } finally {
                          setIsDownloading(false)
                          setDownloadProgress(0)
                        }
                      }}
                      className="flex-1"
                    >
                              <Download className="mr-2 h-4 w-4" />
                      Download All
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={selectedTables.length === 0}
                          onClick={printMultipleQRCodes}
                      className="flex-1"
                        >
                          <Printer className="mr-2 h-4 w-4" />
                      Print
                        </Button>
                      </div>
                    </div>

                    {isDownloading && (
                      <div className="mb-4">
                        <Progress value={downloadProgress} className="h-2" />
                        <p className="text-xs text-center mt-1 text-gray-500">Downloading {downloadProgress}%</p>
                      </div>
                    )}

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {filteredTables.map((table) => (
                    <Card
                      key={table.id}
                      className={`cursor-pointer transition-all ${
                        selectedTable === table.id ? "border-orange-500 ring-2 ring-orange-500" : ""
                      } ${!table.active ? "opacity-50" : ""}`}
                      onClick={() => setSelectedTable(table.id)}
                    >
                      <div className="flex justify-end gap-1 p-1">
                            <button
                              className="h-7 w-7 flex items-center justify-center text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                          title="Download QR Code"
                              onClick={async (e) => {
                            e.stopPropagation();
                                try {
                              const qrUrl = getCustomerMenuUrl(table);
                                  const qrResponse = await fetch(
                                `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}&margin=10`
                              );
                              if (!qrResponse.ok) throw new Error(`Failed to fetch QR code image for ${table.name}`);
                              const blob = await qrResponse.blob();
                              const url = window.URL.createObjectURL(blob);
                              const link = document.createElement("a");
                              link.href = url;
                              link.download = `${table.name.replace(/\s+/g, "-")}-qrcode.png`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              window.URL.revokeObjectURL(url);
                            } catch (error) {
                              // Optionally handle error
                            }
                          }}
                            >
                              <Download className="h-4 w-4" />
                            </button>
                            <button
                          className="h-7 w-7 flex items-center justify-center text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                          title="Print QR Code"
                              onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const qrUrl = getCustomerMenuUrl(table);
                              const printWindow = window.open("", "_blank");
                              if (!printWindow) return;
                                  printWindow.document.write(`
                                    <html>
                                      <head>
                                        <title>Print QR Code</title>
                                        <style>
                                          body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
                                          img { max-width: 100%; height: auto; }
                                          @media print { @page { margin: 0.5cm; } }
                                        </style>
                                      </head>
                                      <body>
                                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}&margin=10" alt="QR Code for ${table.name}" />
                                        <div>${table.name}</div>
                                        <script>
                                          setTimeout(() => { window.print(); window.close(); }, 1000);
                                        </script>
                                      </body>
                                    </html>
                              `);
                              printWindow.document.close();
                            } catch (error) {
                              // Optionally handle error
                            }
                          }}
                            >
                              <Printer className="h-4 w-4" />
                            </button>
                        <button
                          className="h-7 w-7 flex items-center justify-center text-destructive hover:text-red-700 hover:bg-red-50 rounded"
                          title="Delete Table"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTable(table.id);
                          }}
                        >
                          <Trash className="h-4 w-4" />
                        </button>
                          </div>
                      <CardHeader className="flex flex-row items-center justify-between p-3">
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    checked={selectedTables.includes(table.id)}
                                    onCheckedChange={() => toggleTableSelection(table.id)}
                                    onClick={(e) => e.stopPropagation()}
                          />
                          <CardTitle className="text-base">{table.name}</CardTitle>
                        </div>
                        <Switch
                          checked={table.active}
                          onCheckedChange={() => toggleTableStatus(table.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-5 w-9"
                        />
                      </CardHeader>
                      <CardContent className="p-3">
                        <div className="text-sm text-muted-foreground">
                          Section: {table.section}
                          </div>
                        </CardContent>
                      </Card>
                  ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
          <div className="space-y-6">
            <Card>
                  <CardHeader>
                <CardTitle>QR Code</CardTitle>
                  </CardHeader>
              <CardContent className="flex flex-col items-center">
                {tables.find((t) => t.id === selectedTable) ? (
                  <>
                          <QRCodeGenerator
                      value={getCustomerMenuUrl(tables.find((t) => t.id === selectedTable)!)}
                            size={qrCodeSize}
                            includeTableInfo={includeTableInfo}
                            includeRestaurantLogo={includeRestaurantLogo}
                      tableInfo={tables.find((t) => t.id === selectedTable)!}
                    />
                    <div className="text-center mt-2 font-semibold">
                      {tables.find((t) => t.id === selectedTable)?.name}
                        </div>
                  </>
                ) : (
                  <div className="text-center text-muted-foreground py-10">Select a table to see the QR code</div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Add New Table</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tableName">Table Name</Label>
                              <Input
                    id="tableName"
                    value={newTable.name}
                    onChange={(e) => setNewTable({ ...newTable, name: e.target.value })}
                    placeholder="e.g. Table 1"
                            />
                          </div>
                <div className="space-y-2">
                  <Label htmlFor="tableSection">Section</Label>
                  <Input
                    id="tableSection"
                    value={newTable.section}
                    onChange={(e) => setNewTable({ ...newTable, section: e.target.value })}
                            />
                          </div>
                <Button onClick={handleAddTable} className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Table
                </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
      )}
          </div>
  )
}