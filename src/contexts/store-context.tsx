'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

export interface Store {
  id: string;
  ownerId: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  businessType?: string;
  logo?: string;
  settings?: Record<string, unknown>;
  status: 'active' | 'inactive';
}

export interface StoreUser {
  id: string;
  email: string;
  displayName?: string;
  role: string;
  permissions: Record<string, string[]>;
  stores: Store[];
}

interface StoreContextType {
  currentStore: Store | null;
  stores: Store[];
  user: StoreUser | null;
  isLoading: boolean;
  error: string | null;
  switchStore: (storeId: string) => void;
  refreshStores: () => Promise<void>;
  logout: () => Promise<void>;
}

const STORE_STORAGE_KEY = 'smartinventory_current_store_id';
const STORE_COOKIE_NAME = 'current-store-id';

const StoreContext = createContext<StoreContextType | null>(null);

export function useStore(): StoreContextType {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}

export function useCurrentStore(): Store | null {
  const { currentStore } = useStore();
  return currentStore;
}

export function useStoreId(): string | null {
  const { currentStore } = useStore();
  return currentStore?.id ?? null;
}

interface StoreProviderProps {
  children: React.ReactNode;
}

export function StoreProvider({ children }: StoreProviderProps) {
  const [stores, setStores] = useState<Store[]>([]);
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [user, setUser] = useState<StoreUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  // Load saved store ID from localStorage
  const getSavedStoreId = useCallback((): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(STORE_STORAGE_KEY);
    } catch {
      return null;
    }
  }, []);

  // Save store ID to localStorage and cookie
  const saveStoreId = useCallback((storeId: string | null) => {
    if (typeof window === 'undefined') return;
    try {
      if (storeId) {
        localStorage.setItem(STORE_STORAGE_KEY, storeId);
        // Also set cookie for server actions
        document.cookie = `${STORE_COOKIE_NAME}=${storeId}; path=/; max-age=${60 * 60 * 24 * 365}`; // 1 year
      } else {
        localStorage.removeItem(STORE_STORAGE_KEY);
        // Remove cookie
        document.cookie = `${STORE_COOKIE_NAME}=; path=/; max-age=0`;
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Fetch user data and stores from API
  const fetchUserAndStores = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Not authenticated - clear state
          setUser(null);
          setStores([]);
          setCurrentStore(null);
          saveStoreId(null);
          return;
        }
        throw new Error('Failed to fetch user data');
      }

      const data = await response.json();
      
      if (data.success && data.user) {
        const userData: StoreUser = {
          id: data.user.id,
          email: data.user.email,
          displayName: data.user.displayName,
          role: data.user.role,
          permissions: data.user.permissions || {},
          stores: data.user.stores || [],
        };

        setUser(userData);
        setStores(userData.stores);

        // Determine which store to select
        const savedStoreId = getSavedStoreId();
        let storeToSelect: Store | null = null;

        if (savedStoreId) {
          // Try to find saved store in user's stores
          storeToSelect = userData.stores.find(s => s.id === savedStoreId) || null;
        }

        // If no saved store or saved store not found, select first store
        if (!storeToSelect && userData.stores.length > 0) {
          storeToSelect = userData.stores[0];
        }

        if (storeToSelect) {
          setCurrentStore(storeToSelect);
          saveStoreId(storeToSelect.id);
        }
      }
    } catch (err) {
      console.error('Error fetching user and stores:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [getSavedStoreId, saveStoreId]);

  // Switch to a different store
  const switchStore = useCallback((storeId: string) => {
    const store = stores.find(s => s.id === storeId);
    if (store) {
      setCurrentStore(store);
      saveStoreId(storeId);
    }
  }, [stores, saveStoreId]);

  // Refresh stores data
  const refreshStores = useCallback(async () => {
    await fetchUserAndStores();
  }, [fetchUserAndStores]);

  // Logout user
  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('Error during logout:', err);
    } finally {
      setUser(null);
      setStores([]);
      setCurrentStore(null);
      saveStoreId(null);
    }
  }, [saveStoreId]);

  // Initial load
  useEffect(() => {
    fetchUserAndStores();
  }, [fetchUserAndStores]);

  const value = useMemo<StoreContextType>(() => ({
    currentStore,
    stores,
    user,
    isLoading,
    error,
    switchStore,
    refreshStores,
    logout,
  }), [currentStore, stores, user, isLoading, error, switchStore, refreshStores, logout]);

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
}

export { StoreContext };
