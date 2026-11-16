'use client';

import React, { useState } from 'react';
import { X, Phone, ShieldCheck, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { useCustomerAuth } from '@/context/CustomerAuthContext';

export default function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, login } = useCustomerAuth();

  const [phone, setPhone] = useState('');
  const [step, setStep] = useState('PHONE'); // 'PHONE' | 'OTP'
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isAuthModalOpen) return null;

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setError(null);

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setIsLoading(true);
    try {
      // In production, trigger Firebase Phone Recaptcha + signInWithPhoneNumber
      // In dev/local mode, proceed immediately to OTP step
      await new Promise((r) => setTimeout(r, 400));
      setStep('OTP');
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    setError(null);

    const formattedPhone = phone.startsWith('+91')
      ? phone
      : `+91${phone.replace(/\D/g, '').slice(-10)}`;

    setIsLoading(true);
    try {
      // In dev/test, pass test token or verified phone
      const testToken = `test_token_${formattedPhone.replace(/\D/g, '')}`;
      await login(formattedPhone, testToken);
      // Reset state on successful login
      setStep('PHONE');
      setPhone('');
      setOtp('');
    } catch (err) {
      setError(err.message || 'Invalid or expired OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDevQuickLogin = async (devPhone = '+919876543210') => {
    setError(null);
    setIsLoading(true);
    try {
      setPhone('9876543210');
      const testToken = `test_token_${devPhone.replace(/\D/g, '')}`;
      await login(devPhone, testToken);
      setStep('PHONE');
      setPhone('');
      setOtp('');
    } catch (err) {
      setError(err.message || 'Quick login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAuthModal();
      }}
    >
      <div
        className="auth-modal-card"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '420px',
          padding: '28px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          position: 'relative',
          animation: 'fadeInUp 0.2s ease-out',
        }}
      >
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
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
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '16px',
              backgroundColor: '#D7F0D8',
              color: '#1E6B34',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px',
            }}
          >
            {step === 'PHONE' ? <Phone size={24} /> : <ShieldCheck size={24} />}
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#0F172A', marginBottom: '6px' }}>
            {step === 'PHONE' ? 'Sign In with Mobile' : 'Enter Verification Code'}
          </h3>
          <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.4' }}>
            {step === 'PHONE'
              ? 'Enjoy seamless ordering, unlimited freeze calendar & rotating daily QR pass.'
              : `We sent a 6-digit code to +91 ${phone.replace(/\D/g, '').slice(-10)}`}
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              backgroundColor: '#FEE2E2',
              color: '#991B1B',
              fontSize: '13px',
              marginBottom: '16px',
              lineHeight: '1.4',
            }}
          >
            {error}
          </div>
        )}

        {/* Step 1: Phone */}
        {step === 'PHONE' && (
          <form onSubmit={handleSendOtp}>
            <div style={{ marginBottom: '18px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#475569',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '6px',
                }}
              >
                Mobile Number
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  border: '1.5px solid #CBD5E1',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  background: '#F8FAFC',
                }}
              >
                <span
                  style={{
                    padding: '0 12px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#334155',
                    borderRight: '1px solid #CBD5E1',
                  }}
                >
                  🇮🇳 +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="98765 43210"
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: 'none',
                    outline: 'none',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#0F172A',
                    background: 'transparent',
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || phone.replace(/\D/g, '').length < 10}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#1E6B34',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                opacity: phone.replace(/\D/g, '').length < 10 ? 0.6 : 1,
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="spin" /> Sending OTP...
                </>
              ) : (
                <>
                  Continue <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        )}

        {/* Step 2: OTP */}
        {step === 'OTP' && (
          <form onSubmit={handleVerifyOtp}>
            <div style={{ marginBottom: '18px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#475569',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '6px',
                }}
              >
                6-Digit Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: '1.5px solid #CBD5E1',
                  borderRadius: '12px',
                  outline: 'none',
                  fontSize: '20px',
                  fontWeight: '700',
                  textAlign: 'center',
                  letterSpacing: '6px',
                  color: '#0F172A',
                  background: '#F8FAFC',
                }}
              />
              <div
                style={{
                  marginTop: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setStep('PHONE')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748B',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Change Number
                </button>
                <span style={{ color: '#16A34A', fontWeight: '500' }}>Dev auto-verified</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#1E6B34',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="spin" /> Verifying...
                </>
              ) : (
                'Verify & Continue'
              )}
            </button>
          </form>
        )}

        {/* Demo Fast Track Login */}
        <div
          style={{
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px dashed #E2E8F0',
            textAlign: 'center',
          }}
        >
          <button
            type="button"
            onClick={() => handleDevQuickLogin('+919876543210')}
            disabled={isLoading}
            style={{
              background: '#F0FDF4',
              border: '1px solid #BBF7D0',
              borderRadius: '10px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: '600',
              color: '#166534',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Sparkles size={14} /> One-Tap Dev Login (+91 98765 43210)
          </button>
        </div>
      </div>
    </div>
  );
}

