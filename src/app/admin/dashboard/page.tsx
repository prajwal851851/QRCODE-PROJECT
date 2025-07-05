"use client"

import { useEffect, useState, useCallback, ReactNode } from "react"
import { BarChart } from "@/components/charts/bar-chart"
import { LineChart } from "@/components/charts/line-chart"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowDownIcon, ArrowRightIcon, ArrowUpIcon, CreditCard, DollarSign, ShoppingCart, Users, Bell, Star, Trash2, Delete, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DateRangePicker, quickRanges } from "@/components/ui/date-range-picker"
import { DownloadIcon } from "lucide-react"
import { fetchWithAuth } from '@/lib/api-service'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { error } from "console"
import loading from "../menu/loading"
import styles from './dashboard.module.css'
import { useLanguage } from "@/hooks/use-language"
import i18n from "@/lib/i18n"
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { motion, AnimatePresence } from "framer-motion"
import { useLoading } from '@/contexts/LoadingContext'
import { getApiUrl } from '@/lib/api-service'

interface Review {
  order_id: number | string | null;
  customer_name: string;
  customer_email?: string;
  table_name?: string;
  id: number;
  rating: number;
  comment: string;
  created_at: string;
} // Adjusted to match expected fields for guest and registered reviews

export default function DashboardPage() {
  const { t, isReady } = useLanguage();
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false);
  const { setShow } = useLoading();

  // Filter state
  const [filterType, setFilterType] = useState<'day' | 'month' | 'year' | 'custom'>('day');
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedYear, setSelectedYear] = useState<string>(() => String(new Date().getFullYear()));
  const [dateRange, setDateRange] = useState<{ start: Date | null, end: Date | null }>({ start: null, end: null });
  const [appliedFilter, setAppliedFilter] = useState<any>(null);

  const [waiterCalls, setWaiterCalls] = useState<any[]>([])
  const [showReviews, setShowReviews] = useState(false)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loadingReviews, setLoadingReviews] = useState(false)
  const [deletedReviews, setDeletedReviews] = useState<Review[]>([])
  const [undoTimeout, setUndoTimeout] = useState<NodeJS.Timeout | null>(null)
  const { toast } = useToast()
  const [filterOpen, setFilterOpen] = useState(false);

  // Debug language state
  useEffect(() => {
    console.log('Dashboard: Language ready:', isReady)
    console.log('Dashboard: Current translation test:', t("Dashboard"))
    console.log('Dashboard: localStorage language:', localStorage.getItem('language'))
    console.log('Dashboard: i18n language:', i18n.language)
    console.log('Dashboard: i18n isInitialized:', i18n.isInitialized)
  }, [isReady, t])

  useEffect(() => { setShow(false); }, [setShow]);

  const fetchStats = useCallback(async (filter = appliedFilter) => {
    setLoading(true)
    try {
      let url = `${getApiUrl()}/api/orders/dashboard_full_stats/`
      const params = new URLSearchParams();
      if (filter) {
        if (filter.type === 'day' && filter.date) {
          params.append('start_date', filter.date.toISOString().split('T')[0]);
          params.append('end_date', filter.date.toISOString().split('T')[0]);
        } else if (filter.type === 'month' && filter.month) {
          const [year, month] = filter.month.split('-');
          const start = new Date(Number(year), Number(month) - 1, 1);
          const end = new Date(Number(year), Number(month), 0); // last day of month
          params.append('start_date', start.toISOString().split('T')[0]);
          params.append('end_date', end.toISOString().split('T')[0]);
        } else if (filter.type === 'year' && filter.year) {
          const start = new Date(Number(filter.year), 0, 1);
          const end = new Date(Number(filter.year), 11, 31);
          params.append('start_date', start.toISOString().split('T')[0]);
          params.append('end_date', end.toISOString().split('T')[0]);
        } else if (filter.type === 'custom' && filter.start && filter.end) {
          params.append('start_date', filter.start.toISOString().split('T')[0]);
          params.append('end_date', filter.end.toISOString().split('T')[0]);
        }
      }
      if (Array.from(params).length > 0) {
        url += `?${params.toString()}`;
      }
      const res = await fetchWithAuth(url)
      if (!res.ok) throw new Error("Failed to fetch dashboard stats")
      const data = await res.json()

      // Fetch feedback overview
      const feedbackRes = await fetchWithAuth(`${getApiUrl()}/api/reviews/feedback-overview/`)
      if (feedbackRes.ok) {
        const feedbackData = await feedbackRes.json()
        data.feedback_overview = feedbackData
      }

      // Fetch popular items
      const popularItemsRes = await fetchWithAuth(`${getApiUrl()}/api/popular-items/`)
      if (popularItemsRes.ok) {
        const popularItemsData = await popularItemsRes.json()
        data.popular_items = popularItemsData
      }

      // Fetch table performance
      const tablePerformanceRes = await fetchWithAuth(`${getApiUrl()}/api/table-performance/`)
      if (tablePerformanceRes.ok) {
        const tablePerformanceData = await tablePerformanceRes.json()
        data.table_performance = tablePerformanceData
      }

      // Fetch peak hours analysis
      console.log("Fetching peak hours data...")
      const peakHoursRes = await fetchWithAuth(`${getApiUrl()}/api/peak-hours/`)
      if (peakHoursRes.ok) {
        const peakHoursData = await peakHoursRes.json()
        console.log("Peak hours data received:", peakHoursData)
        data.peak_hours = peakHoursData
      } else {
        console.error("Failed to fetch peak hours data:", await peakHoursRes.text())
      }

      console.log("Final stats data:", data)
      setStats(data)
      setError(null)
    } catch (err: any) {
      console.error("Error in fetchStats:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [appliedFilter])

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 180000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  // Fetch active waiter calls
  useEffect(() => {
    const fetchWaiterCalls = async () => {
      try {
        const res = await fetchWithAuth(`${getApiUrl()}/api/waiter_call/active/`)
        if (!res.ok) return
        const data = await res.json()
        setWaiterCalls(data)
      } catch {}
    }
    fetchWaiterCalls()
    const interval = setInterval(fetchWaiterCalls, 15000)
    return () => clearInterval(interval)
  }, [])

  const resolveWaiterCall = async (id: number) => {
    try {
      const res = await fetch(`${getApiUrl()}/api/waiter_call/${id}/resolve/`, { method: 'POST' })
      if (res.ok) {
        setWaiterCalls((prev) => prev.filter((c) => c.id !== id))
      }
    } catch {}
  }

  const handleExport = () => {
    // Export stats as CSV (basic example)
    const csv = [
      ["Metric", "Value"],
      ["Total Revenue", stats.total_revenue],
      ["Total Orders", stats.total_orders],
      ["Total Customers", stats.total_customers],
      ["Active Tables", stats.active_tables],
      ["Inactive Tables", stats.inactive_tables],
      ["Average Order Value", stats.average_order_value],
      ["Table Occupancy Rate", stats.table_occupancy_rate],
    ].map(row => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'dashboard_stats.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const fetchReviews = async () => {
    setLoadingReviews(true)
    try {
      const res = await fetchWithAuth(`${getApiUrl()}/api/reviews/`)
      if (!res.ok) throw new Error("Failed to fetch reviews")
      const data = await res.json()
      setReviews(data)
    } catch (err) {
      console.error("Error fetching reviews:", err)
      toast({
        title: "Error",
        description: "Failed to fetch reviews",
        variant: "destructive",
      })
    } finally {
      setLoadingReviews(false)
    }
  }

  useEffect(() => {
    if (showReviews) {
      fetchReviews()
    }
  }, [showReviews])

  const handleDeleteReview = async (reviewId: number) => {
    const reviewToDelete = reviews.find(review => review.id === reviewId)
    if (!reviewToDelete) return

    // Show confirmation toast
    const { id: toastId, dismiss: dismissToast } = toast({
      title: "Delete Review",
      description: "Are you sure you want to delete this review?",
      action: (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              dismissToast()
            }}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={async () => {
              dismissToast()
              try {
                const response = await fetchWithAuth(`${getApiUrl()}/api/reviews/${reviewId}/`, {
        method: "DELETE",
      })
      
      if (!response.ok) throw new Error("Failed to delete review")
                
                // Store the deleted review for potential undo
                setDeletedReviews(prev => [...prev, reviewToDelete])
      
      // Remove the deleted review from the state
      setReviews(reviews.filter(review => review.id !== reviewId))
                
                // Show undo toast
                const { id: undoToastId, dismiss: dismissUndoToast } = toast({
                  title: "Review Deleted",
                  description: "The review has been deleted. Undo available for 5 seconds",
                  action: (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          // Recreate the review
                          const response = await fetchWithAuth(`${getApiUrl()}/api/reviews/create/`, {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                              order: reviewToDelete.order_id,
                              rating: reviewToDelete.rating,
                              comment: reviewToDelete.comment,
                            }),
                          })
                          
                          if (!response.ok) throw new Error("Failed to restore review")
                          
                          // Remove from deleted reviews
                          setDeletedReviews(prev => prev.filter(r => r.id !== reviewToDelete.id))
                          
                          // Add back to reviews with the original data
                          const restoredReview = {
                            ...reviewToDelete,
                            id: (await response.json()).id,
                          }
                          setReviews(prev => [...prev, restoredReview])
                          
                          dismissUndoToast()
      
      toast({
                            title: "Review Restored",
                            description: "The review has been restored successfully",
                          })
                        } catch (error) {
                          console.error("Error restoring review:", error)
                          toast({
                            title: "Error",
                            description: "Failed to restore review",
                            variant: "destructive",
                          })
                        }
                      }}
                    >
                      Undo
                    </Button>
                  ),
                })

                // Set timeout to remove undo option after 5 seconds
                if (undoTimeout) clearTimeout(undoTimeout)
                const timeout = setTimeout(() => {
                  setDeletedReviews(prev => prev.filter(r => r.id !== reviewToDelete.id))
                  dismissUndoToast()
                }, 5000)
                setUndoTimeout(timeout)
    } catch (error) {
      console.error("Error deleting review:", error)
      toast({
        title: "Error",
        description: "Failed to delete review",
        variant: "destructive",
      })
    }
            }}
          >
            Delete
          </Button>
        </div>
      ),
    })
  }

  const handleDeleteAllReviews = async () => {
    // Show confirmation toast
    const { id: toastId, dismiss: dismissToast } = toast({
      title: "Delete All Reviews",
      description: "Are you sure you want to delete all reviews?",
      action: (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              dismissToast()
            }}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={async () => {
              dismissToast()
              try {
                // Store all reviews in a local variable before deletion
                const reviewsToDelete = [...reviews]
                setDeletedReviews(reviewsToDelete)
                
                const response = await fetchWithAuth(`${getApiUrl()}/api/reviews/delete-all/`, {
        method: "DELETE",
      })
      
      if (!response.ok) throw new Error("Failed to delete all reviews")
      
      // Clear all reviews from the state
      setReviews([])
                
                // Show undo toast
                const { id: undoToastId, dismiss: dismissUndoToast } = toast({
                  title: "All Reviews Deleted",
                  description: "All reviews have been deleted. Undo available for 5 seconds",
                  action: (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          // Restore all reviews using the local variable
                          const restorePromises = reviewsToDelete.map(review =>
                            fetchWithAuth(`${getApiUrl()}/api/reviews/create/`, {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({
                                order: review.order_id,
                                rating: review.rating,
                                comment: review.comment,
                              }),
                            })
                          )
                          
                          const responses = await Promise.all(restorePromises)
                          const restoredReviews = await Promise.all(responses.map(async (r, index) => {
                            const newReview = await r.json()
                            return {
                              ...reviewsToDelete[index],
                              id: newReview.id,
                            }
                          }))
                          
                          // Update states
                          setDeletedReviews([])
                          setReviews(restoredReviews)
                          
                          // Dismiss the undo toast
                          dismissUndoToast()
      
      toast({
                            title: "Reviews Restored",
                            description: "All reviews have been restored successfully",
                          })
                        } catch (error) {
                          console.error("Error restoring reviews:", error)
                          toast({
                            title: "Error",
                            description: "Failed to restore reviews",
                            variant: "destructive",
                          })
                        }
                      }}
                    >
                      Undo
                    </Button>
                  ),
                })

                // Set timeout to remove undo option after 5 seconds
                if (undoTimeout) clearTimeout(undoTimeout)
                const timeout = setTimeout(() => {
                  setDeletedReviews([])
                  dismissUndoToast()
                }, 5000)
                setUndoTimeout(timeout)
    } catch (error) {
      console.error("Error deleting all reviews:", error)
      toast({
        title: "Error",
        description: "Failed to delete all reviews",
        variant: "destructive",
      })
    }
            }}
          >
            Delete All
          </Button>
        </div>
      ),
    })
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (undoTimeout) {
        clearTimeout(undoTimeout)
      }
    }
  }, [undoTimeout])

  // Filter UI (now in a Sheet)
  const renderFilterUI = () => (
    <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="ml-2" onClick={() => setFilterOpen(true)}>
          {t("Filter")}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="max-w-md w-full">
        <SheetHeader>
          <SheetTitle>{t("Filter by Date")}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 mt-4">
          <select value={filterType} onChange={e => setFilterType(e.target.value as any)} className="border rounded px-2 py-1">
            <option value="day">{t("Day")}</option>
            <option value="month">{t("Month")}</option>
            <option value="year">{t("Year")}</option>
            <option value="custom">{t("Custom Range")}</option>
          </select>
          {filterType === 'day' && (
            <input type="date" value={selectedDate ? selectedDate.toISOString().split('T')[0] : ''} onChange={e => setSelectedDate(e.target.value ? new Date(e.target.value) : null)} className="border rounded px-2 py-1" />
          )}
          {filterType === 'month' && (
            <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="border rounded px-2 py-1" />
          )}
          {filterType === 'year' && (
            <input type="number" min="2000" max="2100" value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="border rounded px-2 py-1 w-24" />
          )}
          {filterType === 'custom' && (
            <div className="flex gap-2">
              <input type="date" value={dateRange.start ? dateRange.start.toISOString().split('T')[0] : ''} onChange={e => setDateRange(r => ({ ...r, start: e.target.value ? new Date(e.target.value) : null }))} className="border rounded px-2 py-1" />
              <span>-</span>
              <input type="date" value={dateRange.end ? dateRange.end.toISOString().split('T')[0] : ''} onChange={e => setDateRange(r => ({ ...r, end: e.target.value ? new Date(e.target.value) : null }))} className="border rounded px-2 py-1" />
            </div>
          )}
          <div className="flex gap-2 mt-2">
            <Button
              variant="default"
              onClick={() => {
                if (filterType === 'day' && selectedDate) {
                  setAppliedFilter({ type: 'day', date: selectedDate });
                } else if (filterType === 'month') {
                  setAppliedFilter({ type: 'month', month: selectedMonth });
                } else if (filterType === 'year') {
                  setAppliedFilter({ type: 'year', year: selectedYear });
                } else if (filterType === 'custom' && dateRange.start && dateRange.end) {
                  setAppliedFilter({ type: 'custom', start: dateRange.start, end: dateRange.end });
                }
                setFilterOpen(false);
              }}
              disabled={
                (filterType === 'day' && !selectedDate) ||
                (filterType === 'month' && !selectedMonth) ||
                (filterType === 'year' && !selectedYear) ||
                (filterType === 'custom' && (!dateRange.start || !dateRange.end))
              }
            >
              {t("Apply Filter")}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setFilterType('day');
                setSelectedDate(new Date());
                setSelectedMonth(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
                setSelectedYear(String(new Date().getFullYear()));
                setDateRange({ start: null, end: null });
                setAppliedFilter(null);
                setFilterOpen(false);
              }}
            >
              {t("Clear Filter")}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );

  // Add a refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <RefreshCw className="h-10 w-10 text-orange-500 animate-spin mb-4" />
        <p className="text-lg font-semibold">Please wait…</p>
        <p className="text-sm text-gray-500">Loading section, this may take a few seconds.</p>
      </div>
    )
  }

  if (!isReady) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Initializing language system...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-500 mb-4">Error loading dashboard</p>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen flex flex-col bg-transparent">
      {/* Waiter Call Notification Banner */}
      {waiterCalls.length > 0 && (
        <div className="bg-orange-100 border-l-4 border-orange-500 p-4 mb-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 mb-1">
            <Bell className="h-5 w-5 text-orange-600" />
            <span className="font-semibold text-orange-900">{t("Waiter Call Notification")}</span>
          </div>
          {waiterCalls.map((call) => (
            <div key={call.id} className="flex items-center gap-4">
              <span className="text-orange-800 font-medium">{t("Table")} {call.table_name} {t("is calling for a waiter")}</span>
              <span className="text-xs text-gray-600">{new Date(call.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-20 p-0 text-green-700 border-green-600 ml-2"
                onClick={() => resolveWaiterCall(call.id)}
              >
                {t("Resolve")}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Reviews Button and Stats Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">{t("Dashboard Overview")}</h1>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowReviews(true)}
            className="flex items-center gap-2 bg-background hover:bg-accent text-foreground border-border"
          >
            <Star className="w-4 h-4" />
            {t("See Reviews")}
          </Button>
          {/* Refresh Button */}
          <Button
            onClick={handleRefresh}
            variant="outline"
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <svg className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582M20 20v-5h-.581M5.635 19.364A9 9 0 1 1 18.364 6.636" /></svg>
            {t("Refresh")}
          </Button>
          {/* Filter Button (SheetTrigger) */}
          {renderFilterUI()}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card className="flex flex-col min-h-[140px] w-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("Total Revenue")}</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center">
            <div className="text-2xl font-bold">
              {typeof stats.total_revenue === 'string' ?
                stats.total_revenue.replace(/(\d+\.\d{2})\d*/, '$1') :
                `Rs ${(Number(stats.total_revenue) || 0).toFixed(2)}`
              }
            </div>
            <p className="text-xs text-muted-foreground">{t("All time")}</p>
          </CardContent>
        </Card>
        <Card className="flex flex-col min-h-[140px] w-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("Total Orders")}</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center">
            <div className="text-2xl font-bold">{stats.total_orders}</div>
            <p className="text-xs text-muted-foreground">{t("All time")}</p>
          </CardContent>
        </Card>
        <Card className="flex flex-col min-h-[140px] w-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("Customers")}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center">
            <div className="text-2xl font-bold">{stats.total_customers}</div>
            <p className="text-xs text-muted-foreground">{t("All time")}</p>
          </CardContent>
        </Card>
        <Card className="flex flex-col min-h-[140px] w-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("Active Tables")}</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center">
            <div className="text-2xl font-bold">{stats.active_tables}</div>
            <p className="text-xs text-muted-foreground">{t("Inactive")}: {stats.inactive_tables}</p>
          </CardContent>
        </Card>
        <Card className="flex flex-col min-h-[140px] w-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("Avg. Order Value")}</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center">
            <div className="text-2xl font-bold">
              Rs {(() => {
                const value = stats.average_order_value;
                if (value === null || value === undefined) {
                  return '0.00';
                }
                const cleanValue = String(value).replace('Rs', '').trim();
                const numValue = Number(cleanValue);
                if (isNaN(numValue)) {
                  return '0.00';
                }
                return numValue.toFixed(2);
              })()}
            </div>
            <p className="text-xs text-muted-foreground">{t("per order")}</p>
          </CardContent>
        </Card>
        <Card className="flex flex-col min-h-[140px] w-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("Table Occupancy Rate")}</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center">
            <div className="text-2xl font-bold">{stats.table_occupancy_rate?.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">{t("Approximate")}</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
        <Card className="col-span-1 lg:col-span-4">
          <CardHeader>
            <CardTitle>{t("Recent Orders")}</CardTitle>
            <CardDescription>{t("Showing the last 5 orders")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recent_orders && stats.recent_orders.length > 0 ? (
                stats.recent_orders.map((order: any) => (
                  <div className="flex items-center" key={order.id}>
                    <div className="ml-4 space-y-1">
                      <p className="text-sm font-medium leading-none">{t("Table")} {order.table_name}</p>
                      <p className="text-sm text-muted-foreground">${Number(order.total).toFixed(2)}</p>
                    </div>
                    <div className="ml-auto font-medium">
                      <span className={`flex items-center text-sm ${order.status === 'completed' ? 'text-green-600' : order.status === 'in-progress' ? 'text-yellow-600' : order.status === 'cancelled' ? 'text-red-600' : 'text-gray-600'}`}>
                        {order.status === 'completed' && <ArrowUpIcon className="mr-1 h-4 w-4" />}
                        {order.status === 'in-progress' && <ArrowRightIcon className="mr-1 h-4 w-4" />}
                        {order.status === 'cancelled' && <ArrowDownIcon className="mr-1 h-4 w-4" />}
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground text-sm">{t("No recent orders.")}</div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" asChild>
              <a href="/admin/orders">
                <ArrowRightIcon className="mr-2 h-4 w-4" />
                {t("See All Orders")}
              </a>
            </Button>
          </CardFooter>
        </Card>
        <Card className="col-span-1 lg:col-span-3">
          <CardHeader>
            <CardTitle>{t("Recent Activities")}</CardTitle>
            <CardDescription>{t("Latest order activities and status updates")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`space-y-4 max-h-[500px] overflow-y-auto pr-2 ${styles.customScrollbar}`}>
              {stats.recent_orders?.map((order: any) => (
                <div key={order.id} className="flex items-start gap-4 p-3 rounded-lg border bg-card">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          order.status === 'completed' ? 'bg-green-500' :
                          order.status === 'pending' ? 'bg-yellow-500' :
                          'bg-gray-500'
                        }`} />
                        <span className="font-medium">{t("Order #")}{order.id}</span>
                    </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleString()}
                      </span>
                  </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{t("Table")} {order.table_number}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className={`font-medium ${
                          order.status === 'completed' ? 'text-green-600' :
                          order.status === 'pending' ? 'text-yellow-600' :
                          'text-gray-600'
                        }`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {order.items?.length || 0} {t("items")}
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <span className="font-medium">
                          ${order.total_amount?.toFixed(2) || '0.00'}
                        </span>
                      </div>
                    </div>

                    {order.items && order.items.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {order.items.map((item: any, index: number) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{item.name}</span>
                            <span className="font-medium">${item.price?.toFixed(2) || '0.00'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
        <Card className="col-span-1 lg:col-span-4">
          <CardHeader>
            <CardTitle>{t("Peak Hours Analysis")}</CardTitle>
            <CardDescription>{t("Busiest times in the last 30 days")}</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.peak_hours ? (
              (() => {
                const allHoursZero = stats.peak_hours.peak_hours.every((h: any) => h.orders === 0);
                const allDaysZero = stats.peak_hours.peak_days.every((d: any) => d.orders === 0);
                if (allHoursZero && allDaysZero) {
                  return (
                    <div className="text-muted-foreground text-sm text-center py-8">
                      {t("No order data available yet")}
                    </div>
                  );
                }
                return (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">{t("Busiest Hour")}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-2xl font-bold">{stats.peak_hours.busiest_hour}</p>
                          <p className="text-sm text-muted-foreground">
                            ({stats.peak_hours.peak_hours[0]?.orders} {t("orders")})
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">{t("Busiest Day")}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-2xl font-bold">{stats.peak_hours.busiest_day}</p>
                          <p className="text-sm text-muted-foreground">
                            ({stats.peak_hours.peak_days[0]?.orders} {t("orders")})
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">{t("Top 3 Busiest Hours")}</h4>
                        <div className="space-y-2">
                          {stats.peak_hours.peak_hours.map((hour: any, index: number) => (
                            <div key={index} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <span className="text-sm font-medium text-primary">{index + 1}</span>
                                </div>
                                <p className="font-medium">{hour.hour}</p>
                              </div>
                              <p className="text-sm text-muted-foreground">{hour.orders} {t("orders")}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium mb-2">{t("Top 3 Busiest Days")}</h4>
                        <div className="space-y-2">
                          {stats.peak_hours.peak_days.map((day: any, index: number) => (
                            <div key={index} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <span className="text-sm font-medium text-primary">{index + 1}</span>
                                </div>
                                <p className="font-medium">{day.day}</p>
                              </div>
                              <p className="text-sm text-muted-foreground">{day.orders} {t("orders")}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="text-muted-foreground text-sm">{t("No order data available")}</div>
            )}
          </CardContent>
        </Card>
        <Card className="col-span-1 lg:col-span-3">
          <CardHeader>
            <CardTitle>{t("Table Performance")}</CardTitle>
            <CardDescription>{t("Most active tables in the last 30 days")}</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.table_performance && stats.table_performance.length > 0 ? (
              <div className={`space-y-4 max-h-[300px] overflow-y-auto pr-2 ${styles.customScrollbar}`}>
                {stats.table_performance.map((table: any, index: number) => (
                  <div key={table.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium">{t("Table")} {table.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {table.occupancy_rate.toFixed(1)}% {t("occupancy rate")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${table.revenue.toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">{table.orders} {t("orders")}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground text-sm">{t("No table data available")}</div>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
        <Card className="col-span-1 lg:col-span-4">
          <CardHeader>
            <CardTitle>{t("Order Analytics")}</CardTitle>
            <CardDescription>{t("Key metrics and insights from your orders")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Average Order Value */}
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">{t("Average Order Value")}</p>
                  <div className="flex items-baseline justify-between">
                    <p className="text-2xl font-bold">
                      Rs {(() => {
                        const value = stats.average_order_value;
                        console.log('Raw Average Order Value:', value, 'Type:', typeof value);
                        if (value === null || value === undefined) {
                          return '0.00';
                        }
                        // Remove 'Rs' prefix and convert to number
                        const cleanValue = String(value).replace('Rs', '').trim();
                        const numValue = Number(cleanValue);
                        console.log('Converted Average Order Value:', numValue);
                        if (isNaN(numValue)) {
                          return '0.00';
                        }
                        return numValue.toFixed(2);
                      })()}
                    </p>
                    <span className="text-sm text-muted-foreground">per order</span>
                  </div>
                </div>
              </div>

              {/* Peak Hour */}
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">{t("Peak Hour")}</p>
                  <div className="flex items-baseline justify-between">
                    <p className="text-2xl font-bold">
                      {stats.peak_hours?.busiest_hour || 'N/A'}
                    </p>
                    <span className="text-sm text-muted-foreground">{t("most orders")}</span>
                  </div>
                </div>
              </div>

              {/* Most Popular Item */}
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">{t("Most Popular Item")}</p>
                  <div className="flex items-baseline justify-between">
                    <p className="text-2xl font-bold truncate">
                      {stats.popular_items?.[0]?.name || 'N/A'}
                    </p>
                    <span className="text-sm text-muted-foreground">
                      {stats.popular_items?.[0]?.orders || 0} {t("orders")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Best Performing Table */}
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">{t("Best Table")}</p>
                  <div className="flex items-baseline justify-between">
                    <p className="text-2xl font-bold">
                      {t("Table")} {stats.table_performance?.[0]?.name || 'N/A'}
                    </p>
                    <span className="text-sm text-muted-foreground">
                      ${typeof stats.table_performance?.[0]?.revenue === 'number'
                        ? stats.table_performance[0].revenue.toFixed(2)
                        : '0.00'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Metrics */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Order Completion Rate */}
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">{t("Order Completion Rate")}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-500"
                        style={{ 
                          width: `${Math.min(
                            (typeof stats.completed_orders === 'number' && typeof stats.total_orders === 'number'
                              ? (stats.completed_orders / (stats.total_orders || 1)) * 100
                              : 0),
                            100
                          )}%` 
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium">
                      {Math.round(
                        (typeof stats.completed_orders === 'number' && typeof stats.total_orders === 'number'
                          ? (stats.completed_orders / (stats.total_orders || 1)) * 100
                          : 0)
                      )}%
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {typeof stats.completed_orders === 'number' ? stats.completed_orders : 0} of {typeof stats.total_orders === 'number' ? stats.total_orders : 0} {t("orders completed")}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-1 lg:col-span-3">
          <CardHeader>
            <CardTitle>{t("Pending Actions")}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {stats.pending_actions && stats.pending_actions.length > 0 ? (
              <table className="min-w-full text-xs">
                <thead>
                  <tr>
                    <th className="p-1">{t("Order ID")}</th>
                    <th className="p-1">{t("Table")}</th>
                    <th className="p-1">{t("Status")}</th>
                    <th className="p-1">{t("Total")}</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.pending_actions.map((o: any) => (
                    <tr key={o.id}>
                      <td className="p-1">{o.id}</td>
                      <td className="p-1">{o.table_name}</td>
                      <td className="p-1">{o.status}</td>
                      <td className="p-1">${Number(o.total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div className="text-muted-foreground text-sm">{t("No pending actions")}</div>}
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
        <Card className="col-span-1 lg:col-span-4">
          <CardHeader>
            <CardTitle>{t("Reviews Statistics")}</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.feedback_overview ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">{t("Total Reviews")}</p>
                    <p className="text-2xl font-bold">{stats.feedback_overview.total_reviews}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">{t("Average Rating")}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold">
                        {typeof stats.feedback_overview.average_rating === "number"
                          ? stats.feedback_overview.average_rating.toFixed(1)
                          : "N/A"}
                      </p>
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              typeof stats.feedback_overview.average_rating === "number" && i < Math.round(stats.feedback_overview.average_rating)
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-muted-foreground"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{t("Rating Distribution")}</p>
                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map((rating) => {
                      const dist = stats.feedback_overview.rating_distribution;
                      const count = dist && typeof dist === 'object' && dist[rating] ? dist[rating] : 0;
                      const percentage = (count / stats.feedback_overview.total_reviews) * 100;
                      return (
                        <div key={rating} className="flex items-center gap-2">
                          <div className="flex items-center w-16">
                            <span className="text-sm font-medium">{rating}</span>
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 ml-1" />
                          </div>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-yellow-400"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground w-12 text-right">
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">{t("Positive Reviews (4-5★)")}</p>
                    <p className="text-2xl font-bold text-green-600">
                      {typeof stats.feedback_overview.positive_reviews_percentage === "number"
                        ? stats.feedback_overview.positive_reviews_percentage.toFixed(1) + "%"
                        : "0.0%"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">{t("Negative Reviews (1-2★)")}</p>
                    <p className="text-2xl font-bold text-red-600">
                      {typeof stats.feedback_overview.negative_reviews_percentage === "number"
                        ? stats.feedback_overview.negative_reviews_percentage.toFixed(1) + "%"
                        : "0.0%"}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground text-sm">{t("No feedback data available")}</div>
            )}
          </CardContent>
        </Card>
        <Card className="col-span-1 lg:col-span-3">
          <CardHeader>
            <CardTitle>{t("Popular Items")}</CardTitle>
            <CardDescription>{t("Most ordered items in the last 30 days")}</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.popular_items && stats.popular_items.length > 0 ? (
              <div className={`space-y-4 max-h-[300px] overflow-y-auto pr-2 ${styles.customScrollbar}`}>
                {stats.popular_items.map((item: any, index: number) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium">{item.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{item.total_orders}</p>
                      <p className="text-sm text-muted-foreground">{t("orders")}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground text-sm">{t("No order data available")}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reviews Dialog */}
      <AnimatePresence>
        {showReviews && (
      <Dialog open={showReviews} onOpenChange={setShowReviews}>
            <DialogContent
              className={`max-w-3xl max-h-[80vh] overflow-y-auto ${styles.customScrollbar} bg-white/30 backdrop-blur-lg shadow-2xl border border-white/40 rounded-2xl p-6 animate-fadeIn`}
            >
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
          <DialogHeader className="flex flex-row items-center justify-between">
                  <DialogTitle className="text-xl font-bold text-gray-900 drop-shadow">{t("Customer Reviews")}</DialogTitle>
            {reviews.length > 0 && (
              <Button
                onClick={handleDeleteAllReviews}
                variant="destructive"
                size="sm"
                      className="flex items-center gap-2 h-8 px-3 shadow hover:scale-105 transition-transform"
              >
                <Delete className="w-4 h-4" />
                {t("Delete All")}
              </Button>
            )}
          </DialogHeader>
                <div className="space-y-6 mt-4">
            {loadingReviews ? (
                    <div className="text-center py-4 animate-pulse text-lg text-gray-700">{t("Loading reviews...")}</div>
                  ) :
                    reviews.length > 0 ? (
                      reviews.map((review: Review, idx) => (
                        <motion.div
                          key={review.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.07, duration: 0.4, type: "spring", bounce: 0.2 }}
                        >
                          <Card className="hover:shadow-2xl transition-shadow bg-white/60 backdrop-blur rounded-xl border border-white/40 p-4 group relative overflow-hidden">
                            <div className="absolute inset-0 pointer-events-none group-hover:bg-primary/10 transition-colors duration-300 rounded-xl" />
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                                  <CardTitle className="text-lg text-gray-900 drop-shadow">{t("Order #")}{review.order_id ?? 'N/A'}</CardTitle>
                                  <CardDescription className="text-gray-700/80">{review.customer_name || t("Anonymous")}</CardDescription>
                      </div>
                                <motion.div className="flex items-center gap-1"
                                  initial="hidden"
                                  animate="visible"
                                  variants={{
                                    hidden: {},
                                    visible: { transition: { staggerChildren: 0.07 } }
                                  }}
                                >
                        {[...Array(5)].map((_, i) => (
                                    <motion.span
                            key={i}
                                      variants={{
                                        hidden: { scale: 0.7, opacity: 0 },
                                        visible: { scale: 1, opacity: 1 }
                                      }}
                                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                    >
                                      <Star
                                        className={`w-5 h-5 transition-colors duration-200 ${i < review.rating ? "fill-yellow-400 text-yellow-400 drop-shadow" : "text-gray-300"}`}
                                      />
                                    </motion.span>
                                  ))}
                                </motion.div>
                    </div>
                  </CardHeader>
                  <CardContent>
                              <p className="text-base text-gray-800 font-medium animate-fadeInUp">{review.comment}</p>
                              <p className="text-xs text-gray-500/80 mt-2 animate-fadeInUp">
                      {new Date(review.created_at).toLocaleString()}
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteReview(review.id)}
                                className="text-destructive hover:text-destructive/90 hover:scale-110 transition-transform"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardFooter>
                </Card>
                        </motion.div>
              ))
            ) : (
                      <div className="text-center py-4 text-muted-foreground animate-fadeInUp">{t("No reviews yet")}</div>
                    )
                  }
          </div>
              </motion.div>
        </DialogContent>
      </Dialog>
        )}
      </AnimatePresence>
    </div>
  )
}
