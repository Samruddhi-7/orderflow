"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface CartItem {
  id: string;
  name: string;
  price: string | number; // usually string from numeric in db
  quantity: number;
}

export interface CartState {
  vendorId: string | null;
  items: CartItem[];
}

interface CartContextType {
  cart: CartState;
  addItem: (vendorId: string, item: Omit<CartItem, "quantity">) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartState>({ vendorId: null, items: [] });
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem("cart");
    if (saved) {
      try {
        setCart(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse cart", e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save to local storage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("cart", JSON.stringify(cart));
    }
  }, [cart, isLoaded]);

  const addItem = (vendorId: string, item: Omit<CartItem, "quantity">) => {
    setCart((prev) => {
      // If adding item from a different vendor, clear the cart first
      if (prev.vendorId !== null && prev.vendorId !== vendorId) {
        return {
          vendorId,
          items: [{ ...item, quantity: 1 }],
        };
      }

      const existingItem = prev.items.find((i) => i.id === item.id);
      if (existingItem) {
        return {
          vendorId,
          items: prev.items.map((i) =>
            i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
          ),
        };
      }

      return {
        vendorId,
        items: [...prev.items, { ...item, quantity: 1 }],
      };
    });
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    setCart((prev) => {
      if (quantity <= 0) {
        const newItems = prev.items.filter((i) => i.id !== itemId);
        return {
          vendorId: newItems.length === 0 ? null : prev.vendorId,
          items: newItems,
        };
      }
      return {
        ...prev,
        items: prev.items.map((i) =>
          i.id === itemId ? { ...i, quantity } : i
        ),
      };
    });
  };

  const removeItem = (itemId: string) => {
    setCart((prev) => {
      const newItems = prev.items.filter((i) => i.id !== itemId);
      return {
        vendorId: newItems.length === 0 ? null : prev.vendorId,
        items: newItems,
      };
    });
  };

  const clearCart = () => {
    setCart({ vendorId: null, items: [] });
  };

  const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.items.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        cart,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
