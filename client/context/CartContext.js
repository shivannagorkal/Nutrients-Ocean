'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { calculateDeliveryFeeDetails, getCurrentUserLocation, STALL_COORDINATES } from '@/lib/geo';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [fulfillmentType, setFulfillmentType] = useState('PICKUP'); // 'PICKUP' | 'DELIVERY'
  const [deliveryBracket, setDeliveryBracket] = useState('M0_500'); // 'M0_500' | 'M501_1000' | 'M1001_2000'
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [collectionSlot, setCollectionSlot] = useState('MORNING'); // 'MORNING' (6:30 - 8:20 AM) | 'EVENING' (5:00 - 9:30 PM)

  // Location detection state
  const [userLat, setUserLat] = useState(null);
  const [userLng, setUserLng] = useState(null);
  const [distanceMeters, setDistanceMeters] = useState(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState(null);

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

  const getItemQuantity = useCallback(
    (productId, flavor = null) => {
      const match = items.find(
        (it) => it.productId === productId && (it.flavor || null) === (flavor || null)
      );
      return match ? match.quantity : 0;
    },
    [items]
  );

  const setCustomLocation = useCallback((lat, lng, distMeters) => {
    setUserLat(lat);
    setUserLng(lng);
    setDistanceMeters(distMeters);

    if (distMeters <= 500) {
      setDeliveryBracket('M0_500');
    } else if (distMeters <= 1000) {
      setDeliveryBracket('M501_1000');
    } else if (distMeters <= 2000) {
      setDeliveryBracket('M1001_2000');
    } else {
      setDeliveryBracket('OUT_OF_RANGE');
    }
  }, []);

  const detectLocation = useCallback(async () => {
    setIsDetectingLocation(true);
    setLocationError(null);
    try {
      const loc = await getCurrentUserLocation();
      setUserLat(loc.latitude);
      setUserLng(loc.longitude);
      setDistanceMeters(loc.distanceMeters);

      // Auto assign bracket
      if (loc.distanceMeters <= 500) {
        setDeliveryBracket('M0_500');
      } else if (loc.distanceMeters <= 1000) {
        setDeliveryBracket('M501_1000');
      } else if (loc.distanceMeters <= 2000) {
        setDeliveryBracket('M1001_2000');
      } else {
        setDeliveryBracket('OUT_OF_RANGE');
      }
      return loc;
    } catch (err) {
      setLocationError(err.message || 'Could not detect location');
      throw err;
    } finally {
      setIsDetectingLocation(false);
    }
  }, []);

  const itemCount = useMemo(() => {
    return items.reduce((sum, it) => sum + it.quantity, 0);
  }, [items]);

  const subtotalPaise = useMemo(() => {
    return items.reduce((sum, it) => sum + it.pricePaise * it.quantity, 0);
  }, [items]);

  const subtotalRupees = Math.round(subtotalPaise / 100);

  // Live delivery calculations with conditional free delivery thresholds (₹159 & ₹359)
  const deliveryDetails = useMemo(() => {
    if (fulfillmentType === 'PICKUP') {
      return {
        feeRupees: 0,
        feePaise: 0,
        isFree: true,
        outOfRange: false,
        label: 'Stall Pickup (FREE)',
        neededForFree: 0,
      };
    }
    return calculateDeliveryFeeDetails(distanceMeters, subtotalRupees);
  }, [fulfillmentType, distanceMeters, subtotalRupees]);

  const deliveryFeePaise = deliveryDetails.feePaise;
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
        getItemQuantity,
        itemCount,
        subtotalPaise,
        subtotalRupees,
        deliveryFeePaise,
        deliveryDetails,
        totalPaise,
        fulfillmentType,
        setFulfillmentType,
        deliveryBracket,
        setDeliveryBracket,
        deliveryAddress,
        setDeliveryAddress,
        collectionSlot,
        setCollectionSlot,
        userLat,
        userLng,
        distanceMeters,
        setCustomLocation,
        detectLocation,
        isDetectingLocation,
        locationError,
        stallCoordinates: STALL_COORDINATES,
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

