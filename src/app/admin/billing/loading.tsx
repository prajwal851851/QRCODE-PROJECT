import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function BillingLoading() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>

      {/* Subscription Overview Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-80" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-32" />
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-5 w-32" />
                <div className="space-y-2">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="flex justify-between">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs Skeleton */}
      <div className="space-y-4">
        <div className="flex space-x-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40 mb-2" />
            <Skeleton className="h-4 w-60" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-6 w-24" />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[...Array(3)].map((_, j) => (
                      <div key={j}>
                        <Skeleton className="h-4 w-16 mb-1" />
                        <Skeleton className="h-4 w-28" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 