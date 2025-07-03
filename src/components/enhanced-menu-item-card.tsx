import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Plus, Info } from "lucide-react";
import { MenuItem } from "@/lib/types";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface EnhancedMenuItemCardProps {
  item: MenuItem;
  onAddToCart: (quantity: number) => void;
  addedItemInfo: { id: number; message: string } | null;
}

export function EnhancedMenuItemCard({ item, onAddToCart, addedItemInfo }: EnhancedMenuItemCardProps) {
  console.log({ itemInCard: item });
  console.log("Rendering EnhancedMenuItemCard for item:", item);
  console.log("Discount percentage for item:", item.discount_percentage);
  console.log(`Item: ${item.name}, Discount Percentage Received: ${item.discount_percentage}`);
  const handleAddToCart = () => {
    console.log('handleAddToCart called for item:', item.name);
    if (item.available) {
      onAddToCart(1);
    }
  };

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Calculate discounted price
  const discountedPrice = item.discount_percentage
    ? item.price * (1 - item.discount_percentage / 100)
    : item.price;

  // Truncate description for card view
  const truncateDescription = (text: string, limit: number) => {
    if (text.length <= limit) {
      return text;
    }
    return text.slice(0, limit) + '...';
  };

  const displayDescription = truncateDescription(item.description, 90); // Adjust limit as needed

  return (
    <Card className="flex flex-col h-full min-w-[150px]">
      <CardHeader className="p-0">
        <div className="relative w-full h-40">
          <img
            src={item.image || "/placeholder.svg"}
            alt={item.name}
            className="object-cover w-full h-full rounded-t-lg"
            onError={(e) => {
              console.error(`Failed to load image for ${item.name}: ${item.image}`);
              e.currentTarget.src = "/placeholder.svg";
            }}
          />
          {/* Display Discount Badge */}
          {item.discount_percentage && item.discount_percentage > 0 && (
            <Badge className="absolute top-2 left-2 bg-green-500 dark:bg-green-600">-{item.discount_percentage}%</Badge>
          )}
          {item.isNew && (
            <Badge className="absolute top-2 right-2 bg-orange-500">New</Badge>
          )}
          {/* Rating below the image, right-aligned and closer to the image, restored to previous size */}
          {item.rating && (
            <div className="flex justify-end -mt-4">
              <div className="flex items-center gap-1 bg-black/70 rounded px-2 py-1">
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <span className="text-xs font-semibold text-white">{item.rating.toFixed(1)}</span>
              </div>
            </div>
          )}
          <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 rounded-full bg-white/70 hover:bg-white dark:bg-gray-800/70 dark:hover:bg-gray-800"
                aria-label="View Details"
              >
                <Info className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{item.name}</DialogTitle>
                <DialogDescription>
                  Details about {item.name}.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-96 overflow-y-auto">
                <p className="text-sm text-gray-700 dark:text-gray-300">{item.description}</p>
                {/* Display original and discounted price in dialog */}
                {item.discount_percentage && item.discount_percentage > 0 ? (
                   <p className="text-lg font-bold dark:text-white text-green-600">Price: Rs {discountedPrice.toFixed(2)} <span className="text-sm text-gray-500 line-through">Rs {(typeof item.price === 'number' ? item.price : Number(item.price) || 0).toFixed(2)}</span> (-{item.discount_percentage}%)</p>
                ) : (
                   <p className="text-lg font-bold dark:text-white">Price: Rs {(typeof item.price === 'number' ? item.price : Number(item.price) || 0).toFixed(2)}</p>
                )}
                {/* Show attribute badges only in dialog */}
                {item.attributes && item.attributes.length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-2">
                    {item.attributes.map((attr) => (
                      <Badge
                        key={attr}
                        variant="outline"
                        className={
                          attr === "Vegetarian"
                            ? "text-green-600 border-green-600"
                            : attr === "Spicy"
                            ? "text-red-600 border-red-600"
                            : attr === "Gluten-Free"
                            ? "text-blue-600 border-blue-600"
                            : attr === "New"
                            ? "text-purple-600 border-purple-600"
                            : "text-orange-600 border-orange-600"
                        }
                      >
                        {attr}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-5">
        <CardTitle className="text-base font-semibold line-clamp-1">{item.name}</CardTitle>
        <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
          {displayDescription}
        </p>
        <div className="flex items-center justify-between mt-2">
          {/* Display original and discounted price */}
          {item.discount_percentage && item.discount_percentage > 0 ? (
            <div className="flex items-center gap-1">
              <span className="text-base font-bold text-green-600 dark:text-green-400">Rs {discountedPrice.toFixed(2)}</span>
              <span className="text-xs text-gray-500 line-through">Rs {(typeof item.price === 'number' ? item.price : Number(item.price) || 0).toFixed(2)}</span>
            </div>
          ) : (
            <span className="text-base font-bold">Rs {(typeof item.price === 'number' ? item.price : Number(item.price) || 0).toFixed(2)}</span>
          )}
        </div>
        {item.originalPrice && (
          <span className="text-xs text-gray-500 line-through">
            Rs {item.originalPrice.toFixed(2)}
          </span>
        )}

        {addedItemInfo && addedItemInfo.id === item.id && (
          <div className="mt-2 text-sm font-semibold text-red-500 dark:text-red-400">
            {addedItemInfo.message}
          </div>
        )}

      </CardContent>
      <CardFooter className="p-5 pt-0 flex justify-end items-center">
        <Button
          className="w-full text-sm hover:scale-105 active:scale-95 transition-transform"
          disabled={!item.available}
          onClick={handleAddToCart}
        >
          <Plus className="h-3 w-3 mr-1" />
          {item.available ? "Add to Cart" : "Unavailable"}
        </Button>
      </CardFooter>
    </Card>
  );
}