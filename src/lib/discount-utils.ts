
// Helper functions for the discount management page

// Function to generate a random discount code
export function generateDiscountCode(prefix: string = ""): string {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = prefix ? `${prefix}-` : "";
    
    for (let i = 0; i < 6; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    return result;
  }
  
  // Function to validate a discount 
  export function validateDiscount(discount: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!discount.name?.trim()) {
      errors.push("Discount name is required");
    }
    
    if (discount.value === undefined || discount.value <= 0) {
      errors.push("Discount value must be greater than 0");
    }
    
    if (discount.type === "percentage" && discount.value > 100) {
      errors.push("Percentage discount cannot exceed 100%");
    }
    
    if (!discount.startDate) {
      errors.push("Start date is required");
    }
    
    if (!discount.endDate) {
      errors.push("End date is required");
    }
    
    if (discount.startDate && discount.endDate && new Date(discount.startDate) > new Date(discount.endDate)) {
      errors.push("End date must be after start date");
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  