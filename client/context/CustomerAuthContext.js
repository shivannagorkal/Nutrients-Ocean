'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

const CustomerAuthContext = createContext(null);

export function CustomerAuthProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authSuccessCallback, setAuthSuccessCallback] = useState(null);

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

  const openAuthModal = useCallback((callback = null) => {
    setAuthSuccessCallback(() => callback);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
    setAuthSuccessCallback(null);
  }, []);

  const login = async (phone, firebaseIdToken = null) => {
    const data = await api.loginWithPhone(phone, firebaseIdToken);
    setToken(data.accessToken);
    const profile = await api.getProfile();
    setCustomer(profile);
    setIsAuthModalOpen(false);

    if (authSuccessCallback && typeof authSuccessCallback === 'function') {
      authSuccessCallback(profile);
      setAuthSuccessCallback(null);
    }

    return profile;
  };

  const logout = async () => {
    await api.logout();
    setCustomer(null);
    setToken(null);
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

