'use client';

import React, { useState } from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, MapPin, Clock, CreditCard, Banknote, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import api from '@/lib/api';
import Link from 'next/link';

export default function CartDrawer() {
  const {
    items,
    isCartOpen,
    closeCart,
    updateQuantity,
    removeItem,
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
  } = useCart();

  const { isAuthenticated, openAuthModal } = useCustomerAuth();

  const [paymentMethod, setPaymentMethod] = useState('PAY_AT_STALL'); // 'PAY_AT_STALL' | 'RAZORPAY'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [placedOrder, setPlacedOrder] = useState(null);

  if (!isCartOpen) return null;

  const handleCheckout = async () => {
    setError(null);

    if (items.length === 0) {
      setError('Your cart is empty');
      return;
    }

    if (fulfillmentType === 'DELIVERY') {
      if (!deliveryAddress.trim()) {
        setError('Please enter your delivery address');
        return;
      }
      if (deliveryBracket === 'NONE') {
        setError('Please select your distance tier');
        return;
      }
    }

    // Auth gate: If not authenticated, open login modal and continue after login
    if (!isAuthenticated) {
      openAuthModal(() => {
        // Will be resumed by user clicking Place Order again once logged in
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const orderPayload = {
        scheduledDate: new Date().toISOString().slice(0, 10),
        collectionSlot,
        fulfillmentType,
        deliveryBracket: fulfillmentType === 'DELIVERY' ? deliveryBracket : 'NONE',
        deliveryAddress: fulfillmentType === 'DELIVERY' ? deliveryAddress : null,
        paymentMethod,
        items: items.map((it) => ({
          productId: it.productId,
          flavor: it.flavor || null,
          quantity: it.quantity,
        })),
      };

      const result = await api.createOrder(orderPayload);

      if (paymentMethod === 'RAZORPAY' && result.razorpayDetails) {
        // In dev or test mode, automatically simulate Razorpay payment verification
        await api.verifyRazorpayOrder({
          orderId: result.order.id,
          razorpayPaymentId: `pay_test_${Date.now()}`,
          razorpayOrderId: result.razorpayDetails.orderId,
          razorpaySignature: 'test_signature_valid',
        });
      }

      setPlacedOrder(result.order);
      clearCart();
    } catch (err) {
      setError(err.message || 'Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 9998,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeCart();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          height: '100%',
          backgroundColor: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.2)',
          position: 'relative',
          overflowY: 'auto',
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            background: '#FFFFFF',
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: '#DCF4E2',
                color: '#1E6B34',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShoppingBag size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0F172A' }}>Your Cart</h3>
              <p style={{ fontSize: '12px', color: '#64748B' }}>
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </p>
            </div>
          </div>
          <button
            onClick={closeCart}
            style={{
              background: '#F1F5F9',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#475569',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          {placedOrder ? (
            /* Order Placed Success View */
            <div style={{ textAlign: 'center', padding: '40px 10px' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: '#DCFCE7',
                  color: '#15803D',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                }}
              >
                <CheckCircle2 size={36} />
              </div>
              <h4 style={{ fontSize: '22px', fontWeight: '700', color: '#0F172A', marginBottom: '8px' }}>
                Order Confirmed!
              </h4>
              <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '16px' }}>
                Order Number: <strong style={{ color: '#0F172A' }}>{placedOrder.orderNumber}</strong>
              </p>
              <div
                style={{
                  background: '#F8FAFC',
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'left',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  color: '#334155',
                  marginBottom: '24px',
                }}
              >
                <div>
                  <strong>Fulfillment:</strong>{' '}
                  {placedOrder.fulfillmentType === 'DELIVERY' ? 'Home Delivery (<2 km)' : 'Pickup at Stall'}
                </div>
                <div>
                  <strong>Slot:</strong> {placedOrder.collectionSlot}
                </div>
                <div>
                  <strong>Payment:</strong> {placedOrder.paymentMethod} ({placedOrder.paymentStatus})
                </div>
                <div>
                  <strong>Total:</strong> ₹{(Number(placedOrder.totalPaise) / 100).toFixed(2)}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <Link
                  href="/account"
                  onClick={closeCart}
                  style={{
                    display: 'block',
                    padding: '12px',
                    borderRadius: '10px',
                    background: '#1E6B34',
                    color: '#FFFFFF',
                    fontWeight: '600',
                    fontSize: '14px',
                    textAlign: 'center',
                    textDecoration: 'none',
                  }}
                >
                  View in My Account
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setPlacedOrder(null);
                    closeCart();
                  }}
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    background: '#F1F5F9',
                    color: '#475569',
                    fontWeight: '600',
                    fontSize: '14px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Continue Browsing
                </button>
              </div>
            </div>
          ) : items.length === 0 ? (
            /* Empty Cart View */
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B' }}>
              <ShoppingBag size={48} style={{ opacity: 0.3, margin: '0 auto 16px' }} />
              <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#0F172A', marginBottom: '6px' }}>
                Your cart is empty
              </h4>
              <p style={{ fontSize: '13px', marginBottom: '20px' }}>
                Add wholesome protein meals or shakes from our menu.
              </p>
              <Link
                href="/menu"
                onClick={closeCart}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  background: '#1E6B34',
                  color: '#FFFFFF',
                  fontWeight: '600',
                  fontSize: '14px',
                  textDecoration: 'none',
                }}
              >
                Browse Menu <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            /* Active Cart Items & Controls */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {error && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: '#FEE2E2',
                    color: '#991B1B',
                    fontSize: '13px',
                  }}
                >
                  {error}
                </div>
              )}

              {/* Items List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {items.map((it) => (
                  <div
                    key={`${it.productId}-${it.flavor || 'default'}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px',
                      background: '#F8FAFC',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <div style={{ flex: 1, marginRight: '12px' }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#0F172A' }}>{it.name}</div>
                      {it.flavor && (
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                          Flavor: <span style={{ color: '#1E6B34', fontWeight: '500' }}>{it.flavor}</span>
                        </div>
                      )}
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#1E6B34', marginTop: '4px' }}>
                        ₹{(it.pricePaise / 100).toFixed(0)}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          background: '#FFFFFF',
                          border: '1px solid #CBD5E1',
                          borderRadius: '8px',
                          overflow: 'hidden',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => updateQuantity(it.productId, it.flavor, it.quantity - 1)}
                          style={{
                            padding: '6px 8px',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#475569',
                          }}
                        >
                          <Minus size={14} />
                        </button>
                        <span style={{ fontSize: '13px', fontWeight: '600', minWidth: '24px', textAlign: 'center' }}>
                          {it.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(it.productId, it.flavor, it.quantity + 1)}
                          style={{
                            padding: '6px 8px',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#475569',
                          }}
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(it.productId, it.flavor)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#EF4444',
                          cursor: 'pointer',
                          padding: '6px',
                        }}
                        title="Remove item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Fulfillment Option */}
              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                  Fulfillment Mode
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setFulfillmentType('PICKUP');
                      setDeliveryBracket('NONE');
                    }}
                    style={{
                      padding: '12px 10px',
                      borderRadius: '10px',
                      border: fulfillmentType === 'PICKUP' ? '2px solid #1E6B34' : '1px solid #CBD5E1',
                      background: fulfillmentType === 'PICKUP' ? '#DCF4E2' : '#FFFFFF',
                      color: fulfillmentType === 'PICKUP' ? '#082D12' : '#475569',
                      fontWeight: '600',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <MapPin size={16} /> Stall Pickup (₹0)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFulfillmentType('DELIVERY');
                      if (deliveryBracket === 'NONE') setDeliveryBracket('M0_500');
                    }}
                    style={{
                      padding: '12px 10px',
                      borderRadius: '10px',
                      border: fulfillmentType === 'DELIVERY' ? '2px solid #1E6B34' : '1px solid #CBD5E1',
                      background: fulfillmentType === 'DELIVERY' ? '#DCF4E2' : '#FFFFFF',
                      color: fulfillmentType === 'DELIVERY' ? '#082D12' : '#475569',
                      fontWeight: '600',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    🛵 Home Delivery (&lt;2km)
                  </button>
                </div>

                {/* Delivery Options */}
                {fulfillmentType === 'DELIVERY' && (
                  <div style={{ marginTop: '14px', background: '#F8FAFC', padding: '14px', borderRadius: '12px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                      Delivery Distance Tier
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '6px' }}>
                      {[
                        { bracket: 'M0_500', label: '< 500m', fee: '₹5' },
                        { bracket: 'M501_1000', label: '500m-1km', fee: '₹10' },
                        { bracket: 'M1001_2000', label: '1-2 km', fee: '₹15' },
                      ].map((t) => (
                        <button
                          key={t.bracket}
                          type="button"
                          onClick={() => setDeliveryBracket(t.bracket)}
                          style={{
                            padding: '8px 4px',
                            borderRadius: '8px',
                            border: deliveryBracket === t.bracket ? '1.5px solid #1E6B34' : '1px solid #CBD5E1',
                            background: deliveryBracket === t.bracket ? '#D7F0D8' : '#FFFFFF',
                            fontSize: '11px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            color: '#1E293B',
                            textAlign: 'center',
                          }}
                        >
                          <div>{t.label}</div>
                          <div style={{ color: '#166534' }}>{t.fee}</div>
                        </button>
                      ))}
                    </div>

                    <div style={{ marginTop: '10px' }}>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                        Delivery Address
                      </label>
                      <input
                        type="text"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="House/Flat No, Apartment, Landmark"
                        style={{
                          width: '100%',
                          marginTop: '4px',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          fontSize: '13px',
                          background: '#FFFFFF',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Time Slot */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                  Target Slot
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setCollectionSlot('MORNING')}
                    style={{
                      padding: '10px',
                      borderRadius: '10px',
                      border: collectionSlot === 'MORNING' ? '2px solid #1E6B34' : '1px solid #CBD5E1',
                      background: collectionSlot === 'MORNING' ? '#DCF4E2' : '#FFFFFF',
                      color: collectionSlot === 'MORNING' ? '#082D12' : '#475569',
                      fontWeight: '600',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <Clock size={14} /> Morning (6:00 - 11:30 AM)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCollectionSlot('EVENING')}
                    style={{
                      padding: '10px',
                      borderRadius: '10px',
                      border: collectionSlot === 'EVENING' ? '2px solid #1E6B34' : '1px solid #CBD5E1',
                      background: collectionSlot === 'EVENING' ? '#DCF4E2' : '#FFFFFF',
                      color: collectionSlot === 'EVENING' ? '#082D12' : '#475569',
                      fontWeight: '600',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <Clock size={14} /> Evening (4:30 - 9:30 PM)
                  </button>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                  Payment Method
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('PAY_AT_STALL')}
                    style={{
                      padding: '10px',
                      borderRadius: '10px',
                      border: paymentMethod === 'PAY_AT_STALL' ? '2px solid #1E6B34' : '1px solid #CBD5E1',
                      background: paymentMethod === 'PAY_AT_STALL' ? '#DCF4E2' : '#FFFFFF',
                      color: paymentMethod === 'PAY_AT_STALL' ? '#082D12' : '#475569',
                      fontWeight: '600',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <Banknote size={15} /> Pay at Stall (Cash / UPI)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('RAZORPAY')}
                    style={{
                      padding: '10px',
                      borderRadius: '10px',
                      border: paymentMethod === 'RAZORPAY' ? '2px solid #1E6B34' : '1px solid #CBD5E1',
                      background: paymentMethod === 'RAZORPAY' ? '#DCF4E2' : '#FFFFFF',
                      color: paymentMethod === 'RAZORPAY' ? '#082D12' : '#475569',
                      fontWeight: '600',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <CreditCard size={15} /> Razorpay Online
                  </button>
                </div>
              </div>

              {/* Order Total Breakdown */}
              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748B', marginBottom: '6px' }}>
                  <span>Items Subtotal</span>
                  <span>₹{(subtotalPaise / 100).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748B', marginBottom: '8px' }}>
                  <span>Delivery Charge</span>
                  <span>{deliveryFeePaise > 0 ? `₹${(deliveryFeePaise / 100).toFixed(2)}` : 'FREE'}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '17px',
                    fontWeight: '700',
                    color: '#0F172A',
                    borderTop: '1px dashed #CBD5E1',
                    paddingTop: '8px',
                  }}
                >
                  <span>Grand Total</span>
                  <span style={{ color: '#1E6B34' }}>₹{(totalPaise / 100).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Checkout Action */}
        {!placedOrder && items.length > 0 && (
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid #E2E8F0',
              background: '#FFFFFF',
              position: 'sticky',
              bottom: 0,
            }}
          >
            <button
              type="button"
              onClick={handleCheckout}
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                background: '#1E6B34',
                color: '#FFFFFF',
                fontSize: '15px',
                fontWeight: '700',
                border: 'none',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="spin" /> Placing Order...
                </>
              ) : !isAuthenticated ? (
                'Sign In & Place Order'
              ) : (
                `Place Order • ₹${(totalPaise / 100).toFixed(2)}`
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

