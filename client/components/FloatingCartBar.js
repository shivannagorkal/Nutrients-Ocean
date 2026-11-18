'use client';

import React from 'react';
import { ShoppingBag, ArrowRight, Sparkles } from 'lucide-react';
import { useCart } from '@/context/CartContext';

export default function FloatingCartBar() {
  const { itemCount, totalPaise, subtotalRupees, openCart, deliveryDetails, fulfillmentType } = useCart();

  if (itemCount === 0) return null;

  const totalRupees = (totalPaise / 100).toFixed(0);

  return (
    <aside
      aria-label="Current order summary"
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)',
        maxWidth: '540px',
        zIndex: 9000,
        animation: 'slideUpBar 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div
        onClick={openCart}
        style={{
          backgroundColor: '#1E6B34',
          color: '#FFFFFF',
          borderRadius: '20px',
          padding: '12px 18px',
          boxShadow: '0 8px 28px rgba(30, 107, 52, 0.38), 0 2px 8px rgba(0, 0, 0, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        }}
      >
        {/* Left: Item count & total */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShoppingBag size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '15px', fontWeight: '800' }}>
                {itemCount} {itemCount === 1 ? 'item' : 'items'} • ₹{totalRupees}
              </span>
            </div>
            <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '1px' }}>
              {fulfillmentType === 'DELIVERY' && deliveryDetails.isFree ? (
                <span style={{ color: '#86EFAC', fontWeight: '700' }}>
                  🎉 Free Delivery Unlocked
                </span>
              ) : fulfillmentType === 'DELIVERY' && deliveryDetails.neededForFree > 0 ? (
                <span>Add ₹{deliveryDetails.neededForFree} more for FREE delivery</span>
              ) : (
                <span>Stall Pickup • Ready in minutes</span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Action button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#FFFFFF',
            color: '#1E6B34',
            padding: '8px 14px',
            borderRadius: '9999px',
            fontSize: '13px',
            fontWeight: '700',
          }}
        >
          <span>View Cart</span>
          <ArrowRight size={15} />
        </div>
      </div>
    </aside>
  );
}
