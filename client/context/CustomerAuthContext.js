'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import api from '@/lib/api';

const CustomerAuthContext = createContext(null);

export function CustomerAuthProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authSuccessCallback, setAuthSuccessCallback] = useState(null);

  const pathname = usePathname();
  const router = useRouter();

  const refreshProfile = useCallback(async () => {
    const storedToken = api.getToken();
    if (!storedToken) {
      setCustomer(null);
      setToken(null);
      setIsLoading(false);
      return null;
    }

    try {
      setToken(storedToken);
      const profile = await api.getProfile();
      setCustomer(profile);
      return profile;
    } catch (err) {
      console.warn('Failed to fetch customer profile, clearing session', err);
      api.setToken(null);
      setCustomer(null);
      setToken(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  // Client-side route guard:
  // 1. Authenticated users cannot access guest-only routes (/, /login, /register)
  // 2. Unauthenticated guests cannot access protected routes (/account)
  useEffect(() => {
    if (isLoading || !pathname) return;

    const guestOnlyRoutes = ['/', '/login', '/register'];
    const protectedRoutes = ['/account'];

    if (customer && guestOnlyRoutes.includes(pathname)) {
      router.replace('/menu');
    } else if (!customer && protectedRoutes.some((r) => pathname.startsWith(r))) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [customer, isLoading, pathname, router]);

  const openAuthModal = useCallback((callback = null) => {
    setAuthSuccessCallback(() => callback);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
    setAuthSuccessCallback(null);
  }, []);

  const login = async (phone, password) => {
    const data = await api.loginCustomer({ phone, password });
    setToken(data.token);
    setCustomer(data.customer);
    setIsAuthModalOpen(false);

    if (authSuccessCallback && typeof authSuccessCallback === 'function') {
      authSuccessCallback(data.customer);
      setAuthSuccessCallback(null);
    }

    return data.customer;
  };

  const register = async (phone, fullName, password) => {
    const data = await api.registerCustomer({ phone, fullName, password });
    setToken(data.token);
    setCustomer(data.customer);
    setIsAuthModalOpen(false);

    if (authSuccessCallback && typeof authSuccessCallback === 'function') {
      authSuccessCallback(data.customer);
      setAuthSuccessCallback(null);
    }

    return data.customer;
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (e) {
      console.warn('Logout API error:', e);
    } finally {
      setCustomer(null);
      setToken(null);
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
  };

  return (
    <CustomerAuthContext.Provider
      value={{
        customer,
        token,
        isLoading,
        isAuthenticated: !!customer,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
}

