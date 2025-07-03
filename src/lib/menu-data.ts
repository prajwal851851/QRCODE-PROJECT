export interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  image_url?: string;
  rating?: number | null;
  is_new: boolean;
  original_price?: number | null;
  attributes: string[];
  available: boolean;
  category: string | null;
  quantity?: number;
  isVegetarian?: boolean;
  isSpicy?: boolean;
  isNew?: boolean;
  originalPrice?: number | null;
}

export interface MenuCategory {
  id: number;
  name: string;
  slug?: string;
  items: MenuItem[];
}

export interface MenuData {
  specials: MenuItem[];
  categories: {
    [key: string]: MenuCategory;
  };
}

export interface Category {
  id: number;
  name: string;
  slug: string;
}

// Sample menu data
export const menuData: MenuData = {
  specials: [
    {
      id: 1,
      name: "Special Burger",
      description: "Our signature burger with special sauce",
      price: 12.99,
      image: "/images/burger.jpg",
      rating: 4.5,
      is_new: true,
      originalPrice: 15.99,
      attributes: ["spicy"],
      available: true,
      category: "main",
      isSpicy: true
    },
    {
      id: 2,
      name: "Pasta Special",
      description: "Homemade pasta with fresh ingredients",
      price: 14.99,
      image: "/images/pasta.jpg",
      rating: 4.8,
      is_new: true,
      originalPrice: 17.99,
      attributes: ["vegetarian"],
      available: true,
      category: "main",
      isVegetarian: true
    }
  ],
  categories: {
    starters: {
      id: 1,
      name: "Starters",
      items: [
        {
          id: 3,
          name: "Garlic Bread",
          description: "Toasted bread with garlic butter",
          price: 4.99,
          image: "/images/garlic-bread.jpg",
          rating: 4.2,
          is_new: false,
          attributes: ["vegetarian"],
          available: true,
          category: "starters",
          isVegetarian: true
        },
        {
          id: 4,
          name: "Bruschetta",
          description: "Toasted bread with tomatoes and herbs",
          price: 5.99,
          image: "/images/bruschetta.jpg",
          rating: 4.4,
          is_new: false,
          attributes: ["vegetarian"],
          available: true,
          category: "starters",
          isVegetarian: true
        }
      ]
    },
    main: {
      id: 2,
      name: "Main Course",
      items: [
        {
          id: 5,
          name: "Grilled Salmon",
          description: "Fresh salmon with seasonal vegetables",
          price: 18.99,
          image: "/images/salmon.jpg",
          rating: 4.7,
          is_new: false,
          attributes: ["healthy"],
          available: true,
          category: "main"
        },
        {
          id: 6,
          name: "Beef Steak",
          description: "Premium cut beef with mushroom sauce",
          price: 24.99,
          image: "/images/steak.jpg",
          rating: 4.9,
          is_new: false,
          attributes: ["spicy"],
          available: true,
          category: "main",
          isSpicy: true
        }
      ]
    },
    desserts: {
      id: 3,
      name: "Desserts",
      items: [
        {
          id: 7,
          name: "Chocolate Cake",
          description: "Rich chocolate cake with ganache",
          price: 6.99,
          image: "/images/chocolate-cake.jpg",
          rating: 4.6,
          is_new: false,
          attributes: ["vegetarian"],
          available: true,
          category: "desserts",
          isVegetarian: true
        },
        {
          id: 8,
          name: "Ice Cream",
          description: "Vanilla ice cream with seasonal berries",
          price: 5.99,
          image: "/images/ice-cream.jpg",
          rating: 4.3,
          is_new: false,
          attributes: ["vegetarian"],
          available: true,
          category: "desserts",
          isVegetarian: true
        }
      ]
    }
  }
};