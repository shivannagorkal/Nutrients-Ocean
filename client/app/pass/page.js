'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import {
  QrCode,
  Clock,
  ShieldCheck,
  Snowflake,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  Calendar,
  Sparkles,
  Loader2,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import api from '@/lib/api';

export default function PassPage() {
  const { customer, isAuthenticated, isLoading, openAuthModal } = useCustomerAuth();

  const [passData, setPassData] = useState(null);
  const [secondsRemaining, setSecondsRemaining] = useState(60);
  const [isFetchingPass, setIsFetchingPass] = useState(false);
  const [error, setError] = useState(null);
  const [isUnfreezing, setIsUnfreezing] = useState(false);

  const fetchLivePass = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsFetchingPass(true);
    try {
      const data = await api.getLivePass();
      setPassData(data);
      setSecondsRemaining(data?.secondsRemaining || 60);
      setError(null);
    } catch (err) {
      setError(err.message || 'No active pass found for today.');
      setPassData(null);
    } finally {
      setIsFetchingPass(false);
    }
  }, [isAuthenticated]);

  // Initial load
  useEffect(() => {
    fetchLivePass();
  }, [fetchLivePass]);

  // 1-second countdown timer
  useEffect(() => {
    if (!passData) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          fetchLivePass();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [passData, fetchLivePass]);

  const handleUnfreezeToday = async () => {
    if (!passData?.subscriptionId || !passData?.dateIST) return;
    setIsUnfreezing(true);
    try {
      await api.unfreezeSubscriptionDate(passData.subscriptionId, passData.dateIST);
      await fetchLivePass();
    } catch (err) {
      alert(`Unfreeze failed: ${err.message}`);
    } finally {
      setIsUnfreezing(false);
    }
  };

  const qrPayloadString = passData?.qrPayload ? JSON.stringify(passData.qrPayload) : '';

  return (
    <>
      <Navbar forceScrolled />
      <main
        style={{
          minHeight: '85vh',
          backgroundColor: '#0F172A',
          color: '#FFFFFF',
          paddingTop: '100px',
          paddingBottom: '60px',
        }}
      >
        <div className="container" style={{ maxWidth: '480px', margin: '0 auto', padding: '0 16px' }}>
          {/* Back link */}
          <div style={{ marginBottom: '16px' }}>
            <Link
              href="/account"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: '#94A3B8',
                fontSize: '13px',
                fontWeight: '600',
                textDecoration: 'none',
              }}
            >
              <ArrowLeft size={16} /> Back to My Account
            </Link>
          </div>

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <Loader2 size={36} className="spin" style={{ color: '#71BC75', margin: '0 auto' }} />
              <p style={{ marginTop: '12px', color: '#94A3B8' }}>Loading your daily pass...</p>
            </div>
          ) : !isAuthenticated ? (
            /* Guest Login Prompt */
            <div
              style={{
                backgroundColor: '#1E293B',
                borderRadius: '24px',
                padding: '40px 24px',
                textAlign: 'center',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
                border: '1px solid #334155',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '20px',
                  backgroundColor: '#064E3B',
                  color: '#71BC75',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                }}
              >
                <QrCode size={32} />
              </div>
              <h3 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '8px' }}>Daily QR Pass</h3>
              <p style={{ fontSize: '14px', color: '#94A3B8', lineHeight: '1.5', marginBottom: '24px' }}>
                Sign in with your mobile number to display your live 60-second rotating pass at the stall counter.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => openAuthModal()}
                style={{ width: '100%', padding: '14px', fontSize: '15px', fontWeight: '700' }}
              >
                Sign In with Mobile
              </button>
            </div>
          ) : !passData ? (
            /* No Pass Available State */
            <div
              style={{
                backgroundColor: '#1E293B',
                borderRadius: '24px',
                padding: '40px 24px',
                textAlign: 'center',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
                border: '1px solid #334155',
              }}
            >
              <AlertCircle size={40} style={{ color: '#F59E0B', margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '6px' }}>No Active Pass Today</h3>
              <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '24px', lineHeight: '1.5' }}>
                {error ||
                  'You do not have an active monthly subscription or scheduled pickup order for today.'}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  type="button"
                  onClick={fetchLivePass}
                  disabled={isFetchingPass}
                  className="btn btn-tonal"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <RefreshCw size={15} className={isFetchingPass ? 'spin' : ''} />
                  <span>Check Again</span>
                </button>
                <Link
                  href="/menu#subscriptions"
                  className="btn btn-primary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    textDecoration: 'none',
                  }}
                >
                  <Sparkles size={16} /> Explore Monthly Plans
                </Link>
              </div>
            </div>
          ) : (
            /* High Contrast Rotating QR Pass Card */
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '28px',
                color: '#0F172A',
                padding: '28px',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)',
                textAlign: 'center',
                position: 'relative',
              }}
            >
              {/* Pass Brand Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1.5px dashed #E2E8F0',
                  paddingBottom: '16px',
                  marginBottom: '20px',
                }}
              >
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#64748B' }}>
                    Nutrients Ocean Stall Pass
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A', marginTop: '2px' }}>
                    {passData.planName || 'Daily Fresh Meal'}
                  </h3>
                  {passData.flavor && (
                    <div style={{ fontSize: '12px', color: '#1E6B34', fontWeight: '600' }}>
                      Flavor: {passData.flavor}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    textAlign: 'right',
                    backgroundColor: '#DCF4E2',
                    padding: '6px 12px',
                    borderRadius: '12px',
                  }}
                >
                  <div style={{ fontSize: '10px', fontWeight: '700', color: '#082D12', textTransform: 'uppercase' }}>
                    Slot
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#1E6B34' }}>{passData.slot}</div>
                </div>
              </div>

              {/* Status Banner */}
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '14px',
                  marginBottom: '20px',
                  fontSize: '13px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  backgroundColor:
                    passData.statusCode === 'FROZEN'
                      ? '#EFF6FF'
                      : passData.statusCode === 'COLLECTED'
                      ? '#F0FDF4'
                      : '#DCFCE7',
                  color:
                    passData.statusCode === 'FROZEN'
                      ? '#1D4ED8'
                      : passData.statusCode === 'COLLECTED'
                      ? '#15803D'
                      : '#166534',
                }}
              >
                {passData.statusCode === 'FROZEN' ? (
                  <Snowflake size={16} />
                ) : passData.statusCode === 'COLLECTED' ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <ShieldCheck size={16} />
                )}
                <span>{passData.statusMessage}</span>
              </div>

              {/* QR Container */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  padding: '16px',
                  borderRadius: '20px',
                  border: '2px solid #0F172A',
                  display: 'inline-block',
                  margin: '0 auto',
                  filter: passData.statusCode === 'FROZEN' ? 'grayscale(80%) opacity(60%)' : 'none',
                  transition: 'filter 0.3s ease',
                }}
              >
                <QRCodeSVG
                  value={qrPayloadString}
                  size={210}
                  level="H"
                  includeMargin={false}
                  imageSettings={{
                    src: '/images/logo.png',
                    x: undefined,
                    y: undefined,
                    height: 38,
                    width: 38,
                    excavate: true,
                  }}
                />
              </div>

              {/* 60s Animated Countdown Progress */}
              <div style={{ marginTop: '20px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#64748B',
                    marginBottom: '6px',
                  }}
                >
                  <Clock size={14} style={{ color: '#1E6B34' }} />
                  <span>Refreshes in {secondsRemaining}s</span>
                </div>

                <div
                  style={{
                    height: '6px',
                    width: '100%',
                    backgroundColor: '#E2E8F0',
                    borderRadius: '999px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${(secondsRemaining / 60) * 100}%`,
                      backgroundColor: '#1E6B34',
                      transition: 'width 1s linear',
                    }}
                  />
                </div>
              </div>

              {/* Unfreeze Action if Frozen Today */}
              {passData.statusCode === 'FROZEN' && (
                <div style={{ marginTop: '18px' }}>
                  <button
                    type="button"
                    onClick={handleUnfreezeToday}
                    disabled={isUnfreezing}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: '#2563EB',
                      color: '#FFFFFF',
                      borderRadius: '12px',
                      fontSize: '13px',
                      fontWeight: '700',
                      border: 'none',
                      cursor: isUnfreezing ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    {isUnfreezing ? (
                      <>
                        <Loader2 size={16} className="spin" /> Unfreezing...
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} /> Unfreeze Now & Collect Today
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Servings Counter & Customer Phone */}
              <div
                style={{
                  marginTop: '20px',
                  paddingTop: '16px',
                  borderTop: '1.5px dashed #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  color: '#475569',
                }}
              >
                <div>
                  Member: <strong style={{ color: '#0F172A' }}>{customer?.phone}</strong>
                </div>
                <div>
                  Serving:{' '}
                  <strong style={{ color: '#1E6B34' }}>
                    {passData.servingsUsed || 0} of {passData.totalServings || 30}
                  </strong>
                </div>
              </div>

              {/* Anti-screenshot notice */}
              <div
                style={{
                  marginTop: '16px',
                  fontSize: '11px',
                  color: '#94A3B8',
                  lineHeight: '1.4',
                }}
              >
                🔒 Live rotating QR code refreshed every 60s. Static screenshots will be rejected by the stall scanner.
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

