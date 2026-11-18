'use client';

import React, { useState } from 'react';
import { X, Phone, User, Lock, Eye, EyeOff, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { useCustomerAuth } from '@/context/CustomerAuthContext';

export default function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, login, register } = useCustomerAuth();

  const [mode, setMode] = useState('LOGIN'); // 'LOGIN' | 'REGISTER'
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [infoMessage, setInfoMessage] = useState(null);

  if (!isAuthModalOpen) return null;

  // Password rules check: 6+ chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
  const hasMinLen = password.length >= 6;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNum = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  const isPasswordValid = hasMinLen && hasUpper && hasLower && hasNum && hasSpecial;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError(null);
    setInfoMessage(null);

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    if (mode === 'REGISTER') {
      if (!fullName.trim() || fullName.trim().length < 2) {
        setError('Please enter your full name (minimum 2 characters)');
        return;
      }
      if (!isPasswordValid) {
        setError(
          'Password must have at least 6 characters, including 1 uppercase, 1 lowercase, 1 number, and 1 special character'
        );
        return;
      }

      setIsLoading(true);
      try {
        await register(cleanPhone, fullName.trim(), password);
        // Reset fields
        setPassword('');
      } catch (err) {
        // If already registered, seamlessly switch to LOGIN
        if (err.status === 409 || err.code === 'ALREADY_REGISTERED') {
          setMode('LOGIN');
          setInfoMessage('Mobile number is already registered! Please enter your password to sign in.');
          setError(null);
        } else {
          setError(err.message || 'Registration failed. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    } else {
      // LOGIN mode
      if (!password) {
        setError('Please enter your password');
        return;
      }

      setIsLoading(true);
      try {
        await login(cleanPhone, password);
        setPassword('');
      } catch (err) {
        setError(err.message || 'Invalid mobile number or password.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const toggleMode = (newMode) => {
    setMode(newMode);
    setError(null);
    setInfoMessage(null);
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
          backgroundColor: 'var(--surface-lowest, #FFFFFF)',
          borderRadius: 'var(--shape-xl, 32px)',
          width: '100%',
          maxWidth: '430px',
          padding: '30px 26px',
          boxShadow: 'var(--elev-4)',
          border: '1px solid var(--outline-variant, #DCE3DA)',
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
            background: 'var(--surface-low, #F1F4EE)',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--on-surface-variant, #434942)',
          }}
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {/* Brand / Mode Segmented Tabs */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div
            style={{
              display: 'inline-flex',
              background: 'var(--surface-low, #F1F4EE)',
              padding: '4px',
              borderRadius: 'var(--shape-full, 9999px)',
              border: '1px solid var(--outline-variant, #DCE3DA)',
              marginBottom: '16px',
              width: '100%',
              maxWidth: '300px',
            }}
          >
            <button
              type="button"
              onClick={() => toggleMode('LOGIN')}
              style={{
                flex: 1,
                padding: '8px 16px',
                borderRadius: 'var(--shape-full, 9999px)',
                border: 'none',
                background: mode === 'LOGIN' ? 'var(--surface-lowest, #FFFFFF)' : 'transparent',
                color: mode === 'LOGIN' ? 'var(--primary, #1E6B34)' : 'var(--on-surface-variant, #434942)',
                fontWeight: '700',
                fontSize: '13.5px',
                cursor: 'pointer',
                boxShadow: mode === 'LOGIN' ? 'var(--elev-1)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => toggleMode('REGISTER')}
              style={{
                flex: 1,
                padding: '8px 16px',
                borderRadius: 'var(--shape-full, 9999px)',
                border: 'none',
                background: mode === 'REGISTER' ? 'var(--surface-lowest, #FFFFFF)' : 'transparent',
                color: mode === 'REGISTER' ? 'var(--primary, #1E6B34)' : 'var(--on-surface-variant, #434942)',
                fontWeight: '700',
                fontSize: '13.5px',
                cursor: 'pointer',
                boxShadow: mode === 'REGISTER' ? 'var(--elev-1)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              Register
            </button>
          </div>

          <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--on-surface, #191D19)', margin: 0 }}>
            {mode === 'LOGIN' ? 'Welcome Back!' : 'Create Customer Account'}
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--on-surface-variant, #434942)', marginTop: '4px' }}>
            {mode === 'LOGIN'
              ? 'Enter your mobile number and password to sign in.'
              : 'Register once with your mobile & password for daily stall access.'}
          </p>
        </div>

        {/* Information Message (e.g. Switched to login) */}
        {infoMessage && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--shape-md, 16px)',
              backgroundColor: 'var(--primary-container, #E0F3E2)',
              color: 'var(--on-primary-container, #002107)',
              fontSize: '12.5px',
              fontWeight: '600',
              marginBottom: '16px',
              lineHeight: '1.4',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle2 size={16} color="var(--primary, #1E6B34)" flexShrink={0} />
            <span>{infoMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--shape-md, 16px)',
              backgroundColor: '#FEE2E2',
              color: '#991B1B',
              fontSize: '12.5px',
              fontWeight: '600',
              marginBottom: '16px',
              lineHeight: '1.4',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Full Name Field (Register Only) */}
          {mode === 'REGISTER' && (
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: '700',
                  color: 'var(--on-surface-variant, #434942)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '5px',
                }}
              >
                Full Name
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  border: '1.5px solid var(--outline-variant, #DCE3DA)',
                  borderRadius: 'var(--shape-md, 16px)',
                  background: 'var(--surface-low, #F1F4EE)',
                  padding: '0 12px',
                }}
              >
                <User size={16} color="var(--outline, #727971)" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Rahul Shetty"
                  style={{
                    width: '100%',
                    padding: '11px 10px',
                    border: 'none',
                    outline: 'none',
                    fontSize: '15px',
                    fontWeight: '600',
                    color: 'var(--on-surface, #191D19)',
                    background: 'transparent',
                  }}
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Mobile Number Field */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: '700',
                color: 'var(--on-surface-variant, #434942)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '5px',
              }}
            >
              Mobile Number
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                border: '1.5px solid var(--outline-variant, #DCE3DA)',
                borderRadius: 'var(--shape-md, 16px)',
                overflow: 'hidden',
                background: 'var(--surface-low, #F1F4EE)',
              }}
            >
              <span
                style={{
                  padding: '0 12px',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: 'var(--on-surface, #191D19)',
                  borderRight: '1.5px solid var(--outline-variant, #DCE3DA)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Phone size={14} /> +91
              </span>
              <input
                type="tel"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="98765 43210"
                style={{
                  width: '100%',
                  padding: '11px 12px',
                  border: 'none',
                  outline: 'none',
                  fontSize: '15px',
                  fontWeight: '600',
                  color: 'var(--on-surface, #191D19)',
                  background: 'transparent',
                }}
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
              <label
                style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  color: 'var(--on-surface-variant, #434942)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {mode === 'REGISTER' ? 'Create Password' : 'Password'}
              </label>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                border: '1.5px solid var(--outline-variant, #DCE3DA)',
                borderRadius: 'var(--shape-md, 16px)',
                background: 'var(--surface-low, #F1F4EE)',
                padding: '0 12px',
              }}
            >
              <Lock size={16} color="var(--outline, #727971)" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'REGISTER' ? 'Min 6 chars (e.g. Fit@123)' : 'Enter your password'}
                style={{
                  width: '100%',
                  padding: '11px 10px',
                  border: 'none',
                  outline: 'none',
                  fontSize: '15px',
                  fontWeight: '600',
                  color: 'var(--on-surface, #191D19)',
                  background: 'transparent',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--on-surface-variant, #434942)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Password Requirement Hint (Register Mode) */}
            {mode === 'REGISTER' && (
              <div
                style={{
                  marginTop: '8px',
                  padding: '8px 12px',
                  borderRadius: 'var(--shape-md, 16px)',
                  background: 'var(--surface-low, #F1F4EE)',
                  fontSize: '11.5px',
                  color: 'var(--on-surface-variant, #434942)',
                  lineHeight: '1.4',
                }}
              >
                <div style={{ fontWeight: '700', marginBottom: '2px' }}>Password requirement:</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px' }}>
                  <span style={{ color: hasMinLen ? 'var(--primary, #1E6B34)' : 'inherit' }}>
                    {hasMinLen ? '✓' : '•'} 6+ characters
                  </span>
                  <span style={{ color: hasUpper ? 'var(--primary, #1E6B34)' : 'inherit' }}>
                    {hasUpper ? '✓' : '•'} 1 Uppercase
                  </span>
                  <span style={{ color: hasLower ? 'var(--primary, #1E6B34)' : 'inherit' }}>
                    {hasLower ? '✓' : '•'} 1 Lowercase
                  </span>
                  <span style={{ color: hasNum && hasSpecial ? 'var(--primary, #1E6B34)' : 'inherit' }}>
                    {hasNum && hasSpecial ? '✓' : '•'} Number &amp; Symbol
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Primary Action Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary"
            style={{
              width: '100%',
              minHeight: '48px',
              height: '48px',
              borderRadius: 'var(--shape-full, 9999px)',
              fontSize: '15px',
              fontWeight: '700',
              marginTop: '6px',
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="spin" />
                <span>{mode === 'LOGIN' ? 'Signing In...' : 'Creating Account...'}</span>
              </>
            ) : mode === 'LOGIN' ? (
              <>
                <span>Sign In</span>
                <ArrowRight size={18} />
              </>
            ) : (
              <>
                <span>Create Account</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Switch Mode Footer */}
        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--on-surface-variant, #434942)' }}>
          {mode === 'LOGIN' ? (
            <span>
              New customer?{' '}
              <button
                type="button"
                onClick={() => toggleMode('REGISTER')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary, #1E6B34)',
                  fontWeight: '700',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0,
                }}
              >
                Register here
              </button>
            </span>
          ) : (
            <span>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => toggleMode('LOGIN')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary, #1E6B34)',
                  fontWeight: '700',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0,
                }}
              >
                Sign In
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
