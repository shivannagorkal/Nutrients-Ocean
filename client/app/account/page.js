'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  User,
  Phone,
  QrCode,
  Calendar,
  Snowflake,
  CheckCircle2,
  Clock,
  MapPin,
  LogOut,
  ShoppingBag,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import api from '@/lib/api';

export default function AccountPage() {
  const { customer, isAuthenticated, isLoading, openAuthModal, logout, refreshProfile } =
    useCustomerAuth();

  const [subscriptions, setSubscriptions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(null);
  const [todayStr, setTodayStr] = useState('');
  const [actionMessage, setActionMessage] = useState(null);
  const [freezeProcessingDate, setFreezeProcessingDate] = useState(null);

  useEffect(() => {
    const now = new Date();
    setCalendarMonth(now);
    setTodayStr(now.toISOString().slice(0, 10));
  }, []);

  const loadData = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsFetching(true);
    try {
      const [subsData, ordersData] = await Promise.all([
        api.listSubscriptions(),
        api.listOrders(),
      ]);
      setSubscriptions(subsData || []);
      setOrders(ordersData || []);
    } catch (err) {
      console.warn('Failed to load customer details', err);
    } finally {
      setIsFetching(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeSub = useMemo(() => {
    return subscriptions.find((s) => s.status === 'ACTIVE') || null;
  }, [subscriptions]);

  const frozenDateSet = useMemo(() => {
    if (!activeSub || !activeSub.freezes) return new Set();
    return new Set(
      activeSub.freezes.map((f) => {
        const d = new Date(f.freezeDate);
        return d.toISOString().slice(0, 10);
      })
    );
  }, [activeSub]);

  const redeemedDateSet = useMemo(() => {
    if (!activeSub || !activeSub.redemptions) return new Set();
    return new Set(
      activeSub.redemptions.map((r) => {
        const d = new Date(r.redemptionDate);
        return d.toISOString().slice(0, 10);
      })
    );
  }, [activeSub]);

  // Calendar Day Generation
  const calendarDays = useMemo(() => {
    if (!calendarMonth) return [];
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();

    const firstDay = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    // Padding before
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    // Month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({ day, dateStr });
    }
    return days;
  }, [calendarMonth]);

  const handleToggleFreeze = async (dateStr) => {
    if (!activeSub) return;
    setFreezeProcessingDate(dateStr);
    setActionMessage(null);

    const isCurrentlyFrozen = frozenDateSet.has(dateStr);

    try {
      if (isCurrentlyFrozen) {
        await api.unfreezeSubscriptionDate(activeSub.id, dateStr);
        setActionMessage({ type: 'success', text: `Unfroze ${dateStr}! Ready to collect.` });
      } else {
        await api.freezeSubscriptionDate(activeSub.id, dateStr, 'Customer freeze');
        setActionMessage({ type: 'info', text: `Marked ${dateStr} as frozen! Serving preserved.` });
      }
      await loadData();
      await refreshProfile();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Freeze update failed' });
    } finally {
      setFreezeProcessingDate(null);
    }
  };

  return (
    <>
      <Navbar forceScrolled />
      <main style={{ minHeight: '80vh', backgroundColor: '#F8FBF6', paddingTop: '100px', paddingBottom: '60px' }}>
        <div className="container" style={{ maxWidth: '960px', margin: '0 auto', padding: '0 16px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <Loader2 size={36} className="spin" style={{ color: '#1E6B34', margin: '0 auto' }} />
              <p style={{ marginTop: '12px', color: '#64748B' }}>Loading your account...</p>
            </div>
          ) : !isAuthenticated ? (
            /* Guest View */
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '24px',
                padding: '48px 24px',
                textAlign: 'center',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
                maxWidth: '480px',
                margin: '40px auto',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '20px',
                  backgroundColor: '#DCF4E2',
                  color: '#1E6B34',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                }}
              >
                <User size={32} />
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0F172A', marginBottom: '8px' }}>
                Customer Portal
              </h2>
              <p style={{ fontSize: '14px', color: '#64748B', lineHeight: '1.6', marginBottom: '24px' }}>
                Sign in with your mobile number to view your active 30-day meal subscriptions, unlimited freeze calendar,
                and rotating stall QR pass.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => openAuthModal()}
                style={{ padding: '14px 28px', fontSize: '15px', fontWeight: '700' }}
              >
                Sign In with Mobile
              </button>
            </div>
          ) : (
            /* Authenticated Portal */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              {/* Profile Bar */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '20px',
                  padding: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  flexWrap: 'wrap',
                  gap: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '16px',
                      backgroundColor: '#DCF4E2',
                      color: '#1E6B34',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <User size={24} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0F172A' }}>
                      {customer?.fullName || 'Nutrients Ocean Member'}
                    </h3>
                    <p style={{ fontSize: '13px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Phone size={13} /> {customer?.phone}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Link
                    href="/pass"
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', textDecoration: 'none' }}
                  >
                    <QrCode size={18} />
                    <span>Open Live Pass</span>
                  </Link>
                  <button
                    type="button"
                    onClick={logout}
                    className="btn btn-outline"
                    style={{ padding: '10px 14px', color: '#EF4444', borderColor: '#FCA5A5' }}
                    title="Sign Out"
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              </div>

              {actionMessage && (
                <div
                  style={{
                    padding: '12px 18px',
                    borderRadius: '12px',
                    backgroundColor:
                      actionMessage.type === 'error'
                        ? '#FEE2E2'
                        : actionMessage.type === 'info'
                        ? '#E0F2FE'
                        : '#DCFCE7',
                    color:
                      actionMessage.type === 'error'
                        ? '#991B1B'
                        : actionMessage.type === 'info'
                        ? '#0369A1'
                        : '#15803D',
                    fontSize: '13px',
                    fontWeight: '600',
                  }}
                >
                  {actionMessage.text}
                </div>
              )}

              {/* Active Subscription Section */}
              {activeSub ? (
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '24px',
                    padding: '28px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                    border: '1.5px solid #DCF4E2',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '16px',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    <div>
                      <span
                        style={{
                          backgroundColor: '#DCF4E2',
                          color: '#1E6B34',
                          fontSize: '11px',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          padding: '3px 10px',
                          borderRadius: '999px',
                        }}
                      >
                        Active 30-Day Plan
                      </span>
                      <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0F172A', marginTop: '6px' }}>
                        {activeSub.plan.name}
                      </h2>
                    </div>

                    <Link
                      href="/pass"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: '#1E6B34',
                        color: '#FFFFFF',
                        padding: '10px 16px',
                        borderRadius: '12px',
                        fontSize: '13px',
                        fontWeight: '700',
                        textDecoration: 'none',
                      }}
                    >
                      <QrCode size={16} /> Show QR at Stall
                    </Link>
                  </div>

                  {/* 30-Servings Progress Tracker */}
                  <div
                    style={{
                      backgroundColor: '#F8FAFC',
                      borderRadius: '16px',
                      padding: '20px',
                      marginBottom: '24px',
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                      <span style={{ fontWeight: '600', color: '#334155' }}>Serving Progress</span>
                      <span style={{ fontWeight: '800', color: '#1E6B34' }}>
                        {activeSub.usedServings} / {activeSub.totalServings} Servings Enjoyed
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div
                      style={{
                        height: '10px',
                        backgroundColor: '#E2E8F0',
                        borderRadius: '999px',
                        overflow: 'hidden',
                        marginBottom: '12px',
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.min(100, (activeSub.usedServings / activeSub.totalServings) * 100)}%`,
                          height: '100%',
                          backgroundColor: '#1E6B34',
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>

                    {/* Friendly reassurance rule */}
                    <div
                      style={{
                        backgroundColor: '#F0FDF4',
                        borderRadius: '12px',
                        padding: '10px 14px',
                        fontSize: '13px',
                        color: '#166534',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <Sparkles size={16} style={{ flexShrink: 0 }} />
                      <span>
                        <strong>No hurry!</strong> You have 30 servings to enjoy whenever you visit. Frozen days are
                        never lost.
                      </span>
                    </div>
                  </div>

                  {/* Interactive Unlimited Freeze Calendar */}
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '14px',
                        flexWrap: 'wrap',
                        gap: '8px',
                      }}
                    >
                      <div>
                        <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#0F172A' }}>
                          Unlimited Freeze Calendar
                        </h4>
                        <p style={{ fontSize: '12px', color: '#64748B' }}>
                          Tap any date to freeze or unfreeze. Freezing skips that day and keeps your serving intact.
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() =>
                            setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))
                          }
                          style={{
                            border: '1px solid #CBD5E1',
                            borderRadius: '8px',
                            background: '#FFFFFF',
                            padding: '6px',
                            cursor: 'pointer',
                          }}
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <span style={{ fontSize: '13px', fontWeight: '700', minWidth: '110px', textAlign: 'center' }}>
                          {calendarMonth
                            ? calendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' })
                            : 'This Month'}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))
                          }
                          style={{
                            border: '1px solid #CBD5E1',
                            borderRadius: '8px',
                            background: '#FFFFFF',
                            padding: '6px',
                            cursor: 'pointer',
                          }}
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Day Headers */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, 1fr)',
                        gap: '6px',
                        textAlign: 'center',
                        marginBottom: '6px',
                        fontSize: '11px',
                        fontWeight: '700',
                        color: '#64748B',
                      }}
                    >
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                        <div key={d}>{d}</div>
                      ))}
                    </div>

                    {/* Calendar Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                      {calendarDays.map((cell, idx) => {
                        if (!cell) {
                          return <div key={`empty-${idx}`} style={{ height: '56px' }} />;
                        }

                        const isToday = cell.dateStr === todayStr;
                        const isFrozen = frozenDateSet.has(cell.dateStr);
                        const isRedeemed = redeemedDateSet.has(cell.dateStr);
                        const isProcessing = freezeProcessingDate === cell.dateStr;

                        return (
                          <button
                            key={cell.dateStr}
                            type="button"
                            disabled={isProcessing || isRedeemed}
                            onClick={() => handleToggleFreeze(cell.dateStr)}
                            style={{
                              height: '56px',
                              borderRadius: '10px',
                              border: isToday
                                ? '2px solid #1E6B34'
                                : isFrozen
                                ? '1.5px solid #93C5FD'
                                : isRedeemed
                                ? '1px solid #86EFAC'
                                : '1px solid #E2E8F0',
                              backgroundColor: isFrozen
                                ? '#EFF6FF'
                                : isRedeemed
                                ? '#F0FDF4'
                                : isToday
                                ? '#F8FAFC'
                                : '#FFFFFF',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: isRedeemed ? 'default' : 'pointer',
                              padding: '4px',
                              position: 'relative',
                            }}
                          >
                            <span
                              style={{
                                fontSize: '13px',
                                fontWeight: isToday ? '800' : '600',
                                color: isFrozen ? '#1D4ED8' : isToday ? '#1E6B34' : '#0F172A',
                              }}
                            >
                              {cell.day}
                            </span>

                            {isProcessing ? (
                              <Loader2 size={12} className="spin" style={{ color: '#1E6B34' }} />
                            ) : isRedeemed ? (
                              <span style={{ fontSize: '10px', color: '#15803D', fontWeight: '700' }}>✓ Used</span>
                            ) : isFrozen ? (
                              <span
                                style={{
                                  fontSize: '10px',
                                  color: '#2563EB',
                                  fontWeight: '700',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                }}
                              >
                                ❄️ Frozen
                              </span>
                            ) : isToday ? (
                              <span style={{ fontSize: '9px', color: '#166534', fontWeight: '700' }}>Today</span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                /* No Active Subscription Banner */
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '24px',
                    padding: '36px',
                    textAlign: 'center',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
                  }}
                >
                  <Calendar size={40} style={{ color: '#1E6B34', opacity: 0.5, margin: '0 auto 12px' }} />
                  <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#0F172A', marginBottom: '6px' }}>
                    No Active Subscription
                  </h3>
                  <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '20px', maxWidth: '420px', margin: '0 auto 20px' }}>
                    Subscribe to a 30-day healthy meal plan to enjoy daily fresh protein opposite your gym with unlimited
                    freeze flexibility.
                  </p>
                  <Link
                    href="/menu#subscriptions"
                    className="btn btn-primary"
                    style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Sparkles size={16} /> Explore Monthly Plans
                  </Link>
                </div>
              )}

              {/* Single Orders History */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '24px',
                  padding: '28px',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <ShoppingBag size={20} style={{ color: '#1E6B34' }} />
                  <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0F172A' }}>Recent Orders</h3>
                </div>

                {orders.length === 0 ? (
                  <p style={{ fontSize: '13px', color: '#64748B' }}>No orders placed yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {orders.map((ord) => (
                      <div
                        key={ord.id}
                        style={{
                          border: '1px solid #E2E8F0',
                          borderRadius: '12px',
                          padding: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '12px',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <strong style={{ fontSize: '14px', color: '#0F172A' }}>{ord.orderNumber}</strong>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: '700',
                                padding: '2px 8px',
                                borderRadius: '999px',
                                backgroundColor:
                                  ord.orderStatus === 'COMPLETED'
                                    ? '#DCFCE7'
                                    : ord.orderStatus === 'CANCELLED'
                                    ? '#FEE2E2'
                                    : '#FEF3C7',
                                color:
                                  ord.orderStatus === 'COMPLETED'
                                    ? '#15803D'
                                    : ord.orderStatus === 'CANCELLED'
                                    ? '#991B1B'
                                    : '#B45309',
                              }}
                            >
                              {ord.orderStatus}
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748B' }}>
                            {ord.items?.map((it) => `${it.itemName} (${it.quantity})`).join(', ')}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '15px', fontWeight: '800', color: '#1E6B34' }}>
                            ₹{(Number(ord.totalPaise) / 100).toFixed(2)}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>
                            {ord.fulfillmentType} • {ord.collectionSlot}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
