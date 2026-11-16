'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [fulfillmentType, setFulfillmentType] = useState('PICKUP'); // 'PICKUP' | 'DELIVERY'
  const [deliveryBracket, setDeliveryBracket] = useState('NONE'); // 'NONE' | 'M0_500' | 'M501_1000' | 'M1001_2000'
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [collectionSlot, setCollectionSlot] = useState('MORNING'); // 'MORNING' | 'EVENING'

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('nutrients_ocean_cart');
      if (saved) {
        setItems(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to load cart from storage', e);
    }
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('nutrients_ocean_cart', JSON.stringify(items));
    } catch (e) {
      console.warn('Failed to save cart to storage', e);
    }
  }, [items]);

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  const addItem = (product, flavor = null, quantity = 1) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex(
        (it) => it.productId === (product.id || product.productId) && (it.flavor || null) === (flavor || null)
      );

      const pricePaise = product.currentPricePaise || product.pricePaise || Math.round(Number(product.price || 0) * 100);

      if (existingIndex > -1) {
        const copy = [...prev];
        copy[existingIndex].quantity += quantity;
        return copy;
      }

      return [
        ...prev,
        {
          productId: product.id || product.productId,
          name: product.name,
          flavor: flavor || null,
          pricePaise: Number(pricePaise),
          price: product.price || `₹${(Number(pricePaise) / 100).toFixed(0)}`,
          quantity,
          image: product.image || null,
        },
      ];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (productId, flavor, newQty) => {
    if (newQty <= 0) {
      removeItem(productId, flavor);
      return;
    }
    setItems((prev) =>
      prev.map((it) => {
        if (it.productId === productId && (it.flavor || null) === (flavor || null)) {
          return { ...it, quantity: newQty };
        }
        return it;
      })
    );
  };

  const removeItem = (productId, flavor) => {
    setItems((prev) =>
      prev.filter((it) => !(it.productId === productId && (it.flavor || null) === (flavor || null)))
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const itemCount = useMemo(() => {
    return items.reduce((sum, it) => sum + it.quantity, 0);
  }, [items]);

  const subtotalPaise = useMemo(() => {
    return items.reduce((sum, it) => sum + it.pricePaise * it.quantity, 0);
  }, [items]);

  const deliveryFeePaise = useMemo(() => {
    if (fulfillmentType === 'PICKUP') return 0;
    switch (deliveryBracket) {
      case 'M0_500':
        return 500; // ₹5
      case 'M501_1000':
        return 1000; // ₹10
      case 'M1001_2000':
        return 1500; // ₹15
      default:
        return 0;
    }
  }, [fulfillmentType, deliveryBracket]);

  const totalPaise = subtotalPaise + deliveryFeePaise;

  return (
    <CartContext.Provider
      value={{
        items,
        isCartOpen,
        openCart,
        closeCart,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        itemCount,
        subtotalPaise,
        deliveryFeePaise,
        totalPaise,
        fulfillmentType,
        setFulfillmentType,
        deliveryBracket,
        setDeliveryBracket,
        deliveryAddress,
        setDeliveryAddress,
        collectionSlot,
        setCollectionSlot,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

