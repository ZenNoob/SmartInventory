'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient, CreateStoreRequest, UpdateStoreRequest } from '@/lib/api-client';

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
  createStore: (data: CreateStoreRequest) => Promise<Store>;
  updateStore: (id: string, data: UpdateStoreRequest) => Promise<Store>;
  deactivateStore: (id: string) => Promise<void>;
  deleteStorePermanently: (id: string) => Promise<void>;
}

const STORE_STORAGE_KEY = 'smartinventory_current_store_id';

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

  // Save store ID to localStorage and API client
  const saveStoreId = useCallback((storeId: string | null) => {
    if (typeof window === 'undefined') return;
    try {
      if (storeId) {
        localStorage.setItem(STORE_STORAGE_KEY, storeId);
        apiClient.setStoreId(storeId);
      } else {
        localStorage.removeItem(STORE_STORAGE_KEY);
        apiClient.setStoreId(null);
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
      const token = apiClient.getToken();
      if (!token) {
        setUser(null);
        setStores([]);
        setCurrentStore(null);
        setIsLoading(false);
        return;
      }

      const data = await apiClient.getMe();
      
      if (data.user) {
        // Sync stores first to ensure user has access to all stores
        try {
          const syncResult = await apiClient.syncStores();
          if (syncResult.addedStores && syncResult.addedStores.length > 0) {
            console.log('Auto-synced stores:', syncResult.addedStores);
          }
        } catch (syncError) {
          console.warn('Store sync failed, continuing with existing stores:', syncError);
        }

        // Fetch stores
        const storesData = await apiClient.getStores();
        const userStores = storesData as Store[];

        const userData: StoreUser = {
          id: data.user.id,
          email: data.user.email,
          displayName: data.user.displayName,
          role: data.user.role,
          permissions: data.user.permissions || {},
          stores: userStores,
        };

        setUser(userData);
        setStores(userStores);

        // Determine which store to select
        const savedStoreId = getSavedStoreId();
        let storeToSelect: Store | null = null;

        if (savedStoreId) {
          storeToSelect = userStores.find(s => s.id === savedStoreId) || null;
        }

        if (!storeToSelect && userStores.length > 0) {
          storeToSelect = userStores[0];
        }

        if (storeToSelect) {
          setCurrentStore(storeToSelect);
          saveStoreId(storeToSelect.id);
        }
      }
    } catch (err) {
      console.error('Error fetching user and stores:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      // Clear auth on error
      setUser(null);
      setStores([]);
      setCurrentStore(null);
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
      await apiClient.logout();
    } catch (err) {
      console.error('Error during logout:', err);
    } finally {
      setUser(null);
      setStores([]);
      setCurrentStore(null);
      saveStoreId(null);
    }
  }, [saveStoreId]);

  // Create a new store
  const createStore = useCallback(async (data: CreateStoreRequest): Promise<Store> => {
    const newStore = await apiClient.createStore(data);
    // Refresh stores list to include the new store
    const storesData = await apiClient.getStores();
    const userStores = storesData as Store[];
    setStores(userStores);
    // Auto-switch to the new store
    setCurrentStore(newStore as Store);
    saveStoreId(newStore.id);
    return newStore as Store;
  }, [saveStoreId]);

  // Update an existing store
  const updateStore = useCallback(async (id: string, data: UpdateStoreRequest): Promise<Store> => {
    const updatedStore = await apiClient.updateStore(id, data);
    // Update local state
    setStores(prevStores => 
      prevStores.map(store => store.id === id ? { ...store, ...updatedStore } as Store : store)
    );
    // Update current store if it's the one being updated
    if (currentStore?.id === id) {
      setCurrentStore(prev => prev ? { ...prev, ...updatedStore } as Store : null);
    }
    return updatedStore as Store;
  }, [currentStore?.id]);

  // Deactivate a store (soft delete)
  const deactivateStore = useCallback(async (id: string): Promise<void> => {
    await apiClient.deleteStore(id);
    // Remove from stores list
    const remainingStores = stores.filter(store => store.id !== id);
    setStores(remainingStores);
    // If the deactivated store was the current store, switch to another
    if (currentStore?.id === id) {
      if (remainingStores.length > 0) {
        setCurrentStore(remainingStores[0]);
        saveStoreId(remainingStores[0].id);
      } else {
        setCurrentStore(null);
        saveStoreId(null);
      }
    }
  }, [stores, currentStore?.id, saveStoreId]);

  // Permanently delete a store (hard delete)
  const deleteStorePermanently = useCallback(async (id: string): Promise<void> => {
    await apiClient.deleteStorePermanently(id);
    // Remove from stores list
    const remainingStores = stores.filter(store => store.id !== id);
    setStores(remainingStores);
    // If the deleted store was the current store, switch to another
    if (currentStore?.id === id) {
      if (remainingStores.length > 0) {
        setCurrentStore(remainingStores[0]);
        saveStoreId(remainingStores[0].id);
      } else {
        setCurrentStore(null);
        saveStoreId(null);
      }
    }
  }, [stores, currentStore?.id, saveStoreId]);

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
    createStore,
    updateStore,
    deactivateStore,
    deleteStorePermanently,
  }), [currentStore, stores, user, isLoading, error, switchStore, refreshStores, logout, createStore, updateStore, deactivateStore, deleteStorePermanently]);

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
}

export { StoreContext };
