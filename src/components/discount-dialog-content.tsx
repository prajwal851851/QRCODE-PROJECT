import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { validateDiscount, generateDiscountCode } from "@/lib/discount-utils";
import { toast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DiscountDialogContentProps {
  discount: any;
  setDiscount: React.Dispatch<React.SetStateAction<any>>;
  onSave: () => void;
  onCancel: () => void;
  title: string;
  description: string;
  submitLabel: string;
  menuItems?: any[];
  isNew?: boolean;
}

export function DiscountDialogContent({
  discount,
  setDiscount,
  onSave,
  onCancel,
  title,
  description,
  submitLabel,
  menuItems = [],
  isNew = false,
}: DiscountDialogContentProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = validateDiscount(discount);
    
    if (!validation.valid) {
      // Show validation errors
      toast({
        title: "Validation Error",
        description: validation.errors[0],
        variant: "destructive",
      });
      return;
    }
    
    // If everything is valid, call the onSave function
    onSave();
  };
  
  const generateCode = () => {
    const prefix = discount.name ? discount.name.substring(0, 3).toUpperCase() : "";
    const code = generateDiscountCode(prefix);
    setDiscount({ ...discount, code });
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      
      <ScrollArea className="max-h-[60vh]">
        <div className="grid gap-4 py-4 px-1">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={discount.name || ""}
              onChange={(e) => setDiscount({ ...discount, name: e.target.value })}
              className="col-span-3"
              placeholder="Summer Special"
              required
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description
            </Label>
            <Textarea
              id="description"
              value={discount.description || ""}
              onChange={(e) => setDiscount({ ...discount, description: e.target.value })}
              className="col-span-3"
              placeholder="20% off all main courses"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">
              Type
            </Label>
            <Select
              value={discount.type as string || "percentage"}
              onValueChange={(value) => setDiscount({ ...discount, type: value })}
            >
              <SelectTrigger id="type" className="col-span-3">
                <SelectValue placeholder="Select discount type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage Discount</SelectItem>
                <SelectItem value="fixed">Fixed Amount</SelectItem>
                <SelectItem value="bogo">Buy One Get One</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="value" className="text-right">
              Value
            </Label>
            <Input
              id="value"
              type="number"
              value={discount.value || ""}
              onChange={(e) => setDiscount({ ...discount, value: Number.parseFloat(e.target.value) })}
              className="col-span-3"
              required
              min={0}
              max={discount.type === "percentage" ? 100 : undefined}
              step={discount.type === "percentage" ? 1 : 0.01}
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="code" className="text-right">
              Code
            </Label>
            <div className="col-span-3 flex gap-2">
              <Input
                id="code"
                value={discount.code || ""}
                onChange={(e) => setDiscount({ ...discount, code: e.target.value })}
                className="flex-1"
                placeholder="SUMMER20 (optional)"
              />
              <Button type="button" variant="outline" onClick={generateCode}>
                Generate
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="startDate" className="text-right">
              Start Date
            </Label>
            <Input
              id="startDate"
              type="date"
              value={discount.startDate || ""}
              onChange={(e) => setDiscount({ ...discount, startDate: e.target.value })}
              className="col-span-3"
              required
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="endDate" className="text-right">
              End Date
            </Label>
            <Input
              id="endDate"
              type="date"
              value={discount.endDate || ""}
              onChange={(e) => setDiscount({ ...discount, endDate: e.target.value })}
              className="col-span-3"
              required
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="applicableItems" className="text-right">
              Applies To
            </Label>
            <Select
              value={typeof discount.applicableItems === "string" ? discount.applicableItems : "selected"}
              onValueChange={(value) => {
                if (value === "all") {
                  setDiscount({ ...discount, applicableItems: "all" });
                } else {
                  // For simplicity, we're just setting it to a specific category in this demo
                  setDiscount({
                    ...discount,
                    applicableItems: menuItems
                      .filter((item) => item.category === "main")
                      .map((item) => item.id),
                  });
                }
              }}
            >
              <SelectTrigger id="applicableItems" className="col-span-3">
                <SelectValue placeholder="Select applicable items" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                <SelectItem value="selected">Selected Items</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="minimumOrder" className="text-right">
              Min. Order
            </Label>
            <Input
              id="minimumOrder"
              type="number"
              placeholder="0.00 (optional)"
              value={discount.minimumOrder || ""}
              onChange={(e) =>
                setDiscount({
                  ...discount,
                  minimumOrder: e.target.value ? Number.parseFloat(e.target.value) : undefined,
                })
              }
              className="col-span-3"
              min={0}
              step={0.01}
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="active" className="text-right">
              Active
            </Label>
            <div className="flex items-center space-x-2 col-span-3">
              <Switch
                id="active"
                checked={discount.active || false}
                onCheckedChange={(checked) => setDiscount({ ...discount, active: checked })}
              />
              <Label htmlFor="active">Discount is active</Label>
            </div>
          </div>
        </div>
      </ScrollArea>
      
      <DialogFooter className="mt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{submitLabel}</Button>
      </DialogFooter>
    </form>
  );
}