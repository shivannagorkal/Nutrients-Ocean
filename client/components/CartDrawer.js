'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  MapPin,
  Clock,
  CreditCard,
  Banknote,
  ArrowRight,
  CheckCircle2,
  Loader2,
  QrCode,
  Navigation,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useCart } from '@/context/CartContext';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { getKitchenLiveStatus } from '@/lib/geo';
import MapLocationPicker from './MapLocationPicker';
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
  } = useCart();

  const { isAuthenticated, openAuthModal } = useCustomerAuth();

  const [paymentMethod, setPaymentMethod] = useState('PAY_AT_STALL'); // 'PAY_AT_STALL' | 'UPI_DIRECT' | 'RAZORPAY'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [locationSuccessMsg, setLocationSuccessMsg] = useState(null);
  const [isMapOpen, setIsMapOpen] = useState(false);

  // Live kitchen operating hours status (6:30–8:20 AM and 5:00–9:30 PM IST)
  const [kitchenStatus, setKitchenStatus] = useState({
    isOpen: false,
    activeSession: null,
    nextOpenMessage: 'Checking kitchen operating hours...',
    isMorning: false,
    isEvening: false,
    currentMinutes: 0,
    displayTimeIST: '',
  });

  useEffect(() => {
    // Read live IST time inside useEffect to comply with Next.js client component hydration
    setKitchenStatus(getKitchenLiveStatus());
    const timer = setInterval(() => {
      setKitchenStatus(getKitchenLiveStatus());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  if (!isCartOpen) return null;

  const handleCheckout = async () => {
    setError(null);

    if (items.length === 0) {
      setError('Your cart is empty');
      return;
    }

    // Operating hours check
    if (!kitchenStatus.isOpen) {
      setError(`Our kitchen is currently closed for orders. ${kitchenStatus.nextOpenMessage}`);
      return;
    }

    if (fulfillmentType === 'DELIVERY') {
      if (!deliveryAddress.trim()) {
        setError('Please enter your delivery address (House/Flat No, Landmark)');
        return;
      }
      if (deliveryDetails.outOfRange) {
        setError('Delivery is only available within 2km of our stall. Please select Stall Pickup.');
        return;
      }
    }

    // Auth gate: If not authenticated, open login modal and continue after login
    if (!isAuthenticated) {
      openAuthModal(() => {
        // Resumed by user clicking Place Order again once logged in
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const activeSlot = kitchenStatus.activeSession || collectionSlot || 'MORNING';
      const orderPayload = {
        scheduledDate: new Date().toISOString().slice(0, 10),
        collectionSlot: activeSlot,
        fulfillmentType,
        deliveryBracket: fulfillmentType === 'DELIVERY' ? (deliveryDetails.bracket || deliveryBracket) : 'NONE',
        deliveryAddress: fulfillmentType === 'DELIVERY' ? deliveryAddress : null,
        deliveryLat: userLat,
        deliveryLng: userLng,
        paymentMethod,
        items: items.map((it) => ({
          productId: it.productId,
          name: it.name,
          flavor: it.flavor || null,
          quantity: it.quantity,
          pricePaise: it.pricePaise,
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
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'flex-end',
        background: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(3px)',
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
          background: 'var(--surface, #F8FAF6)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.12)',
          position: 'relative',
          overflowY: 'auto',
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--outline-variant, #DCE3DA)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--surface-lowest, #FFFFFF)',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingBag size={20} style={{ color: 'var(--primary, #1E6B34)' }} />
            <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--on-surface, #191D19)' }}>
              Your Meal Bag
            </h3>
            {itemCount > 0 && (
              <span
                style={{
                  background: 'var(--primary, #1E6B34)',
                  color: '#FFFFFF',
                  borderRadius: '12px',
                  padding: '2px 8px',
                  fontSize: '12px',
                  fontWeight: '700',
                }}
              >
                {itemCount}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={closeCart}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--on-surface-variant, #434942)',
              padding: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
          {placedOrder ? (
            /* Order Placed Success View */
            <div style={{ textAlign: 'center', padding: '30px 10px' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: '#DCFCE7',
                  color: '#15803D',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <CheckCircle2 size={36} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0F172A', marginBottom: '8px' }}>
                Order Confirmed!
              </h3>
              <p style={{ fontSize: '14px', color: '#475569', marginBottom: '6px' }}>
                Order #{placedOrder.order_number}
              </p>
              <div
                style={{
                  display: 'inline-block',
                  background: '#E0F3E2',
                  color: '#1E6B34',
                  fontWeight: '700',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  marginBottom: '16px',
                }}
              >
                {placedOrder.fulfillment_type === 'PICKUP' ? 'Stall Pickup' : 'Doorstep Delivery'} • {placedOrder.collection_slot} Session
              </div>

              {placedOrder.payment_method === 'UPI_DIRECT' && (
                <div
                  style={{
                    background: '#F0FDF4',
                    border: '1.5px dashed #86EFAC',
                    borderRadius: '16px',
                    padding: '16px',
                    marginBottom: '20px',
                    textAlign: 'center',
                  }}
                >
                  <p style={{ fontSize: '13px', fontWeight: '700', color: '#166534', margin: '0 0 10px 0' }}>
                    Complete Payment via UPI (₹{(placedOrder.total_paise / 100).toFixed(0)})
                  </p>
                  <div
                    style={{
                      display: 'inline-block',
                      padding: '10px',
                      background: '#FFFFFF',
                      borderRadius: '12px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                    }}
                  >
                    <QRCodeSVG
                      value={`upi://pay?pa=nutrientsocean@okaxis&pn=Nutrients%20Ocean&am=${(placedOrder.total_paise / 100).toFixed(2)}&cu=INR&tn=Order%20${placedOrder.order_number}`}
                      size={140}
                    />
                  </div>
                  <div style={{ marginTop: '12px' }}>
                    <a
                      href={`upi://pay?pa=nutrientsocean@okaxis&pn=Nutrients%20Ocean&am=${(placedOrder.total_paise / 100).toFixed(2)}&cu=INR&tn=Order%20${placedOrder.order_number}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        borderRadius: '10px',
                        backgroundColor: '#1E6B34',
                        color: '#FFFFFF',
                        fontSize: '13px',
                        fontWeight: '700',
                        textDecoration: 'none',
                      }}
                    >
                      <QrCode size={16} /> Tap to Pay in UPI App
                    </a>
                  </div>
                  <p style={{ fontSize: '11px', color: '#64748B', margin: '8px 0 0 0' }}>
                    UPI ID: <b>nutrientsocean@okaxis</b>
                  </p>
                </div>
              )}

              <div
                style={{
                  background: '#F8FAFC',
                  borderRadius: '14px',
                  padding: '14px',
                  textAlign: 'left',
                  marginBottom: '24px',
                  fontSize: '13px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: '#64748B' }}>Total Amount</span>
                  <span style={{ fontWeight: '700', color: '#0F172A' }}>₹{(placedOrder.total_paise / 100).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: '#64748B' }}>Payment Method</span>
                  <span style={{ fontWeight: '600' }}>{placedOrder.payment_method.replace(/_/g, ' ')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: '#64748B' }}>Status</span>
                  <span style={{ fontWeight: '700', color: '#D97706' }}>RECEIVED (Pending Prep)</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Link
                  href="/account"
                  onClick={() => {
                    setPlacedOrder(null);
                    closeCart();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '12px',
                    borderRadius: '10px',
                    background: '#1E6B34',
                    color: '#FFFFFF',
                    fontWeight: '700',
                    fontSize: '14px',
                    textDecoration: 'none',
                  }}
                >
                  Track Order in My Account <ArrowRight size={16} />
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
                      padding: '14px',
                      background: 'var(--surface-low, #F1F4EE)',
                      borderRadius: 'var(--shape-md, 16px)',
                      border: '1px solid var(--outline-variant, #DCE3DA)',
                    }}
                  >
                    <div style={{ flex: 1, marginRight: '12px' }}>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--on-surface, #191D19)' }}>{it.name}</div>
                      {it.flavor && (
                        <div style={{ fontSize: '11px', color: 'var(--on-surface-variant, #434942)', marginTop: '2px' }}>
                          Flavor: <span style={{ color: 'var(--primary, #1E6B34)', fontWeight: '600' }}>{it.flavor}</span>
                        </div>
                      )}
                      <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--primary, #1E6B34)', marginTop: '4px' }}>
                        ₹{(it.pricePaise / 100).toFixed(0)}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          background: 'var(--surface-lowest, #FFFFFF)',
                          border: '1px solid var(--outline-variant, #DCE3DA)',
                          borderRadius: 'var(--shape-full, 9999px)',
                          overflow: 'hidden',
                          padding: '2px 4px',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => updateQuantity(it.productId, it.flavor, it.quantity - 1)}
                          style={{
                            padding: '4px 8px',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--on-surface-variant, #434942)',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <Minus size={13} />
                        </button>
                        <span style={{ fontSize: '13px', fontWeight: '700', minWidth: '22px', textAlign: 'center', color: 'var(--on-surface, #191D19)' }}>
                          {it.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(it.productId, it.flavor, it.quantity + 1)}
                          style={{
                            padding: '4px 8px',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--on-surface-variant, #434942)',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <Plus size={13} />
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
              <div style={{ borderTop: '1px solid var(--outline-variant, #DCE3DA)', paddingTop: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--on-surface-variant, #434942)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                      borderRadius: 'var(--shape-md, 16px)',
                      border: fulfillmentType === 'PICKUP' ? '2px solid var(--primary, #1E6B34)' : '1px solid var(--outline-variant, #DCE3DA)',
                      background: fulfillmentType === 'PICKUP' ? 'var(--primary-container, #E0F3E2)' : 'var(--surface-lowest, #FFFFFF)',
                      color: fulfillmentType === 'PICKUP' ? 'var(--on-primary-container, #002107)' : 'var(--on-surface-variant, #434942)',
                      fontWeight: '700',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <MapPin size={16} /> Stall Pickup (FREE)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFulfillmentType('DELIVERY');
                      if (deliveryBracket === 'NONE') setDeliveryBracket('M0_500');
                    }}
                    style={{
                      padding: '12px 10px',
                      borderRadius: 'var(--shape-md, 16px)',
                      border: fulfillmentType === 'DELIVERY' ? '2px solid var(--primary, #1E6B34)' : '1px solid var(--outline-variant, #DCE3DA)',
                      background: fulfillmentType === 'DELIVERY' ? 'var(--primary-container, #E0F3E2)' : 'var(--surface-lowest, #FFFFFF)',
                      color: fulfillmentType === 'DELIVERY' ? 'var(--on-primary-container, #002107)' : 'var(--on-surface-variant, #434942)',
                      fontWeight: '700',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    🛵 Delivery (&lt;2km)
                  </button>
                </div>

                {/* Delivery Location Section */}
                {fulfillmentType === 'DELIVERY' && (
                  <div style={{ marginTop: '14px', background: '#F8FAFC', padding: '14px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                        Delivery Spot & Pin
                      </span>
                      {distanceMeters !== null && (
                        <span style={{ fontSize: '11px', fontWeight: '700', color: deliveryDetails.outOfRange ? '#DC2626' : '#166534' }}>
                          {distanceMeters}m ({(distanceMeters / 1000).toFixed(1)} km)
                        </span>
                      )}
                    </div>

                    {/* Chosen Location Display Card & Change Button */}
                    <div
                      style={{
                        padding: '12px',
                        borderRadius: '12px',
                        backgroundColor: '#FFFFFF',
                        border: '1.5px solid #CBD5E1',
                        marginBottom: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <MapPin size={20} style={{ color: '#1E6B34', marginTop: '2px', flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A' }}>
                            {distanceMeters !== null ? (
                              <span>Delivery Spot: {distanceMeters}m from Stall</span>
                            ) : (
                              <span>Location Not Selected</span>
                            )}
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                            {distanceMeters !== null ? (
                              deliveryDetails.outOfRange ? (
                                <span style={{ color: '#DC2626', fontWeight: '600' }}>⚠️ Outside 2km delivery limit (Stall Pickup only)</span>
                              ) : deliveryDetails.isFree ? (
                                <span style={{ color: '#166534', fontWeight: '700' }}>✓ {deliveryDetails.label}</span>
                              ) : (
                                <span>Delivery Charge: ₹{deliveryDetails.feeRupees}</span>
                              )
                            ) : (
                              <span>Choose your exact delivery point on the map below.</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsMapOpen(true)}
                        style={{
                          width: '100%',
                          marginTop: '10px',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          backgroundColor: '#E0F3E2',
                          color: '#1E6B34',
                          border: '1px solid #86EFAC',
                          fontWeight: '700',
                          fontSize: '12.5px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        <Navigation size={14} />
                        <span>{distanceMeters !== null ? 'Change / Adjust Location on Map' : '🗺️ Choose Delivery Spot on Map'}</span>
                      </button>
                    </div>

                    {locationSuccessMsg && (
                      <div style={{ fontSize: '12px', color: '#166534', fontWeight: '600', marginBottom: '8px' }}>
                        {locationSuccessMsg}
                      </div>
                    )}

                    {/* Free Delivery Thresholds Notice */}
                    {deliveryDetails.outOfRange ? (
                      <div
                        style={{
                          padding: '10px 12px',
                          borderRadius: '10px',
                          background: '#FEE2E2',
                          border: '1px solid #FCA5A5',
                          color: '#991B1B',
                          fontSize: '12px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginBottom: '10px',
                        }}
                      >
                        <AlertTriangle size={15} />
                        <span>Distance is {deliveryDetails.distanceKm}km. Fresh delivery is limited to 2km. Please choose Stall Pickup!</span>
                      </div>
                    ) : deliveryDetails.isFree ? (
                      <div
                        style={{
                          padding: '8px 12px',
                          borderRadius: '10px',
                          background: '#DCFCE7',
                          border: '1px solid #86EFAC',
                          color: '#166534',
                          fontSize: '12px',
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginBottom: '10px',
                        }}
                      >
                        <Sparkles size={14} />
                        <span>🎉 FREE Delivery Unlocked on this order!</span>
                      </div>
                    ) : deliveryDetails.neededForFree > 0 ? (
                      <div
                        style={{
                          padding: '8px 12px',
                          borderRadius: '10px',
                          background: '#FEF3C7',
                          border: '1px solid #FCD34D',
                          color: '#92400E',
                          fontSize: '12px',
                          fontWeight: '600',
                          marginBottom: '10px',
                        }}
                      >
                        Add <b>₹{deliveryDetails.neededForFree}</b> more to unlock <b>FREE Delivery</b>!
                      </div>
                    ) : null}

                    {/* Address details input */}
                    <div style={{ marginTop: '10px' }}>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                        Flat / House No & Landmark
                      </label>
                      <input
                        type="text"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="e.g. Flat 302, Green Towers, Next to Gym"
                        style={{
                          width: '100%',
                          marginTop: '4px',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          fontSize: '13px',
                          background: '#FFFFFF',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Kitchen Live Operating Hours Status (Replaces manual slot radios) */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>
                  Kitchen Operating Status
                </label>
                <div style={{ marginTop: '8px' }}>
                  {kitchenStatus.isOpen ? (
                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: '14px',
                        background: '#ECFDF5',
                        border: '1.5px solid #A7F3D0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                      }}
                    >
                      <div
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: '#10B981',
                          boxShadow: '0 0 8px #10B981',
                          flexShrink: 0,
                        }}
                      />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: '#065F46' }}>
                          Kitchen is Open • Accepting Orders Now
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#047857', marginTop: '2px' }}>
                          Current Session: <b>{kitchenStatus.activeSession === 'MORNING' ? 'Morning (6:30 AM – 8:20 AM)' : 'Evening (5:00 PM – 9:30 PM)'}</b>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: '14px',
                        background: '#FFFBEB',
                        border: '1.5px solid #FCD34D',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                      }}
                    >
                      <Clock size={18} style={{ color: '#D97706', marginTop: '2px', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: '#92400E' }}>
                          Kitchen is Closed for Orders
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#B45309', marginTop: '3px', lineHeight: '1.4' }}>
                          {kitchenStatus.nextOpenMessage}
                        </div>
                        <div style={{ fontSize: '11px', color: '#78350F', marginTop: '4px', fontStyle: 'italic' }}>
                          💡 Items stay saved in your cart. You can place your order when the kitchen opens!
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--on-surface-variant, #434942)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Payment Method
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('PAY_AT_STALL')}
                    style={{
                      padding: '10px 4px',
                      borderRadius: '12px',
                      border: paymentMethod === 'PAY_AT_STALL' ? '2px solid #1E6B34' : '1px solid #CBD5E1',
                      background: paymentMethod === 'PAY_AT_STALL' ? '#E0F3E2' : '#FFFFFF',
                      color: paymentMethod === 'PAY_AT_STALL' ? '#002107' : '#434942',
                      fontWeight: '700',
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Banknote size={16} /> Pay at Stall
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('UPI_DIRECT')}
                    style={{
                      padding: '10px 4px',
                      borderRadius: '12px',
                      border: paymentMethod === 'UPI_DIRECT' ? '2px solid #1E6B34' : '1px solid #CBD5E1',
                      background: paymentMethod === 'UPI_DIRECT' ? '#E0F3E2' : '#FFFFFF',
                      color: paymentMethod === 'UPI_DIRECT' ? '#002107' : '#434942',
                      fontWeight: '700',
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <QrCode size={16} /> Direct UPI
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('RAZORPAY')}
                    style={{
                      padding: '10px 4px',
                      borderRadius: '12px',
                      border: paymentMethod === 'RAZORPAY' ? '2px solid #1E6B34' : '1px solid #CBD5E1',
                      background: paymentMethod === 'RAZORPAY' ? '#E0F3E2' : '#FFFFFF',
                      color: paymentMethod === 'RAZORPAY' ? '#002107' : '#434942',
                      fontWeight: '700',
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <CreditCard size={16} /> Razorpay
                  </button>
                </div>

                {/* Direct UPI Interactive Drawer View */}
                {paymentMethod === 'UPI_DIRECT' && (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '14px',
                      borderRadius: '16px',
                      background: '#F0FDF4',
                      border: '1px solid #BBF7D0',
                      textAlign: 'center',
                    }}
                  >
                    <p style={{ fontSize: '12px', fontWeight: '700', color: '#166534', margin: '0 0 10px 0' }}>
                      Scan or Tap to Pay ₹{(totalPaise / 100).toFixed(0)} via Any UPI App
                    </p>
                    <div
                      style={{
                        display: 'inline-block',
                        padding: '10px',
                        background: '#FFFFFF',
                        borderRadius: '14px',
                        border: '1px solid #E2E8F0',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                      }}
                    >
                      <QRCodeSVG
                        value={`upi://pay?pa=nutrientsocean@okaxis&pn=Nutrients%20Ocean&am=${(totalPaise / 100).toFixed(2)}&cu=INR&tn=Order%20Payment`}
                        size={130}
                      />
                    </div>
                    <div style={{ marginTop: '10px' }}>
                      <a
                        href={`upi://pay?pa=nutrientsocean@okaxis&pn=Nutrients%20Ocean&am=${(totalPaise / 100).toFixed(2)}&cu=INR&tn=Order%20Payment`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '8px 16px',
                          borderRadius: '10px',
                          backgroundColor: '#1E6B34',
                          color: '#FFFFFF',
                          fontSize: '12px',
                          fontWeight: '700',
                          textDecoration: 'none',
                        }}
                      >
                        <QrCode size={14} /> Open in GPay / PhonePe / Paytm
                      </a>
                    </div>
                    <p style={{ fontSize: '11px', color: '#64748B', margin: '8px 0 0 0' }}>
                      After payment, click Place Order below to receive your confirmation receipt!
                    </p>
                  </div>
                )}
              </div>

              {/* Order Total Breakdown */}
              <div style={{ borderTop: '1px solid var(--outline-variant, #DCE3DA)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--on-surface-variant, #434942)', marginBottom: '6px' }}>
                  <span>Items Subtotal</span>
                  <span>₹{(subtotalPaise / 100).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--on-surface-variant, #434942)', marginBottom: '8px' }}>
                  <span>Delivery Charge</span>
                  <span>{deliveryFeePaise > 0 ? `₹${(deliveryFeePaise / 100).toFixed(2)}` : 'FREE'}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '17px',
                    fontWeight: '800',
                    color: 'var(--on-surface, #191D19)',
                    borderTop: '1.5px dashed var(--outline-variant, #DCE3DA)',
                    paddingTop: '10px',
                  }}
                >
                  <span>Grand Total</span>
                  <span style={{ color: 'var(--primary, #1E6B34)' }}>₹{(totalPaise / 100).toFixed(2)}</span>
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
              borderTop: '1px solid var(--outline-variant, #DCE3DA)',
              background: 'var(--surface-lowest, #FFFFFF)',
              position: 'sticky',
              bottom: 0,
            }}
          >
            {!kitchenStatus.isOpen ? (
              <div>
                <button
                  type="button"
                  disabled
                  style={{
                    width: '100%',
                    minHeight: '50px',
                    height: '50px',
                    borderRadius: 'var(--shape-full, 9999px)',
                    fontSize: '14px',
                    fontWeight: '700',
                    backgroundColor: '#94A3B8',
                    color: '#FFFFFF',
                    cursor: 'not-allowed',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <Clock size={16} /> Kitchen Closed • Order Timing Locked
                </button>
                <p style={{ textAlign: 'center', fontSize: '11px', color: '#64748B', margin: '6px 0 0 0' }}>
                  Orders open: <b>6:30–8:20 AM</b> & <b>5:00–9:30 PM</b>
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleCheckout}
                disabled={isSubmitting || (fulfillmentType === 'DELIVERY' && deliveryDetails.outOfRange)}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  minHeight: '50px',
                  height: '50px',
                  borderRadius: 'var(--shape-full, 9999px)',
                  fontSize: '15px',
                  fontWeight: '700',
                  cursor: isSubmitting || (fulfillmentType === 'DELIVERY' && deliveryDetails.outOfRange) ? 'not-allowed' : 'pointer',
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
            )}
          </div>
        )}

        {/* Interactive Leaflet Map Location Picker Modal */}
        <MapLocationPicker
          isOpen={isMapOpen}
          onClose={() => setIsMapOpen(false)}
          initialLat={userLat}
          initialLng={userLng}
          subtotalRupees={subtotalRupees}
          onConfirmLocation={(lat, lng, dist) => {
            setCustomLocation(lat, lng, dist);
            setLocationSuccessMsg(`📍 Delivery spot set: ~${dist}m from Stall`);
          }}
        />
      </div>
    </div>
  );
}
