import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { StoreProvider, useStore, Store } from './store-context';
import { apiClient, Store as ApiStore } from '@/lib/api-client';

// Mock the apiClient
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    getToken: vi.fn(),
    setToken: vi.fn(),
    getStoreId: vi.fn(),
    setStoreId: vi.fn(),
    getMe: vi.fn(),
    getStores: vi.fn(),
    createStore: vi.fn(),
    updateStore: vi.fn(),
    deleteStore: vi.fn(),
    deleteStorePermanently: vi.fn(),
    logout: vi.fn(),
  },
}));

// Mock stores for context (Store from store-context)
const mockStore1: Store = {
  id: 'store-1',
  ownerId: 'user-1',
  name: 'Store 1',
  code: 'S1',
  status: 'active',
};

const mockStore2: Store = {
  id: 'store-2',
  ownerId: 'user-1',
  name: 'Store 2',
  code: 'S2',
  status: 'active',
};

// Mock stores for API responses (with createdAt/updatedAt)
const mockApiStore1 = {
  ...mockStore1,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockApiStore2 = {
  ...mockStore2,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  displayName: 'Test User',
  role: 'owner',
  permissions: {},
};

describe('StoreContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('createStore', () => {
    it('should create a new store and auto-switch to it', async () => {
      const newApiStore = {
        id: 'store-new',
        ownerId: 'user-1',
        name: 'New Store',
        code: 'NS',
        status: 'active' as const,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      vi.mocked(apiClient.getToken).mockReturnValue('test-token');
      vi.mocked(apiClient.getMe).mockResolvedValue({ user: mockUser, stores: [] });
      vi.mocked(apiClient.getStores).mockResolvedValueOnce([mockApiStore1] as ApiStore[]).mockResolvedValueOnce([mockApiStore1, newApiStore] as ApiStore[]);
      vi.mocked(apiClient.createStore).mockResolvedValue(newApiStore as ApiStore);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <StoreProvider>{children}</StoreProvider>
      );

      const { result } = renderHook(() => useStore(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        const created = await result.current.createStore({ name: 'New Store' });
        expect(created.id).toBe('store-new');
      });

      expect(apiClient.createStore).toHaveBeenCalledWith({ name: 'New Store' });
      expect(result.current.currentStore?.id).toBe('store-new');
      expect(result.current.stores).toHaveLength(2);
    });
  });

  describe('updateStore', () => {
    it('should update store and refresh local state', async () => {
      const updatedApiStore = { ...mockApiStore1, name: 'Updated Store 1' };

      vi.mocked(apiClient.getToken).mockReturnValue('test-token');
      vi.mocked(apiClient.getMe).mockResolvedValue({ user: mockUser, stores: [] });
      vi.mocked(apiClient.getStores).mockResolvedValue([mockApiStore1, mockApiStore2] as ApiStore[]);
      vi.mocked(apiClient.updateStore).mockResolvedValue(updatedApiStore as ApiStore);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <StoreProvider>{children}</StoreProvider>
      );

      const { result } = renderHook(() => useStore(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        const updated = await result.current.updateStore('store-1', { name: 'Updated Store 1' });
        expect(updated.name).toBe('Updated Store 1');
      });

      expect(apiClient.updateStore).toHaveBeenCalledWith('store-1', { name: 'Updated Store 1' });
      expect(result.current.stores.find(s => s.id === 'store-1')?.name).toBe('Updated Store 1');
    });

    it('should update currentStore if it is the one being updated', async () => {
      const updatedApiStore = { ...mockApiStore1, name: 'Updated Store 1' };

      vi.mocked(apiClient.getToken).mockReturnValue('test-token');
      vi.mocked(apiClient.getMe).mockResolvedValue({ user: mockUser, stores: [] });
      vi.mocked(apiClient.getStores).mockResolvedValue([mockApiStore1, mockApiStore2] as ApiStore[]);
      vi.mocked(apiClient.updateStore).mockResolvedValue(updatedApiStore as ApiStore);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <StoreProvider>{children}</StoreProvider>
      );

      const { result } = renderHook(() => useStore(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.currentStore?.id).toBe('store-1');
      });

      await act(async () => {
        await result.current.updateStore('store-1', { name: 'Updated Store 1' });
      });

      expect(result.current.currentStore?.name).toBe('Updated Store 1');
    });
  });

  describe('deactivateStore', () => {
    it('should remove store from list after deactivation', async () => {
      vi.mocked(apiClient.getToken).mockReturnValue('test-token');
      vi.mocked(apiClient.getMe).mockResolvedValue({ user: mockUser, stores: [] });
      vi.mocked(apiClient.getStores).mockResolvedValue([mockApiStore1, mockApiStore2] as ApiStore[]);
      vi.mocked(apiClient.deleteStore).mockResolvedValue(mockApiStore1 as ApiStore);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <StoreProvider>{children}</StoreProvider>
      );

      const { result } = renderHook(() => useStore(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.stores).toHaveLength(2);
      });

      // Switch to store-2 first so deactivating store-1 doesn't trigger auto-switch
      act(() => {
        result.current.switchStore('store-2');
      });

      await act(async () => {
        await result.current.deactivateStore('store-1');
      });

      expect(apiClient.deleteStore).toHaveBeenCalledWith('store-1');
      expect(result.current.stores).toHaveLength(1);
      expect(result.current.stores[0].id).toBe('store-2');
    });

    it('should auto-switch to another store when current store is deactivated', async () => {
      vi.mocked(apiClient.getToken).mockReturnValue('test-token');
      vi.mocked(apiClient.getMe).mockResolvedValue({ user: mockUser, stores: [] });
      vi.mocked(apiClient.getStores).mockResolvedValue([mockApiStore1, mockApiStore2] as ApiStore[]);
      vi.mocked(apiClient.deleteStore).mockResolvedValue(mockApiStore1 as ApiStore);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <StoreProvider>{children}</StoreProvider>
      );

      const { result } = renderHook(() => useStore(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.currentStore?.id).toBe('store-1');
      });

      await act(async () => {
        await result.current.deactivateStore('store-1');
      });

      expect(result.current.currentStore?.id).toBe('store-2');
    });

    it('should set currentStore to null when last store is deactivated', async () => {
      vi.mocked(apiClient.getToken).mockReturnValue('test-token');
      vi.mocked(apiClient.getMe).mockResolvedValue({ user: mockUser, stores: [] });
      vi.mocked(apiClient.getStores).mockResolvedValue([mockApiStore1] as ApiStore[]);
      vi.mocked(apiClient.deleteStore).mockResolvedValue(mockApiStore1 as ApiStore);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <StoreProvider>{children}</StoreProvider>
      );

      const { result } = renderHook(() => useStore(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.currentStore?.id).toBe('store-1');
      });

      await act(async () => {
        await result.current.deactivateStore('store-1');
      });

      expect(result.current.currentStore).toBeNull();
      expect(result.current.stores).toHaveLength(0);
    });
  });

  describe('deleteStorePermanently', () => {
    it('should permanently delete store and remove from list', async () => {
      vi.mocked(apiClient.getToken).mockReturnValue('test-token');
      vi.mocked(apiClient.getMe).mockResolvedValue({ user: mockUser, stores: [] });
      vi.mocked(apiClient.getStores).mockResolvedValue([mockApiStore1, mockApiStore2] as ApiStore[]);
      vi.mocked(apiClient.deleteStorePermanently).mockResolvedValue({ 
        success: true, 
        message: 'Đã xóa cửa hàng vĩnh viễn',
        deletedData: { products: 5, orders: 10, customers: 3 }
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <StoreProvider>{children}</StoreProvider>
      );

      const { result } = renderHook(() => useStore(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.stores).toHaveLength(2);
      });

      // Switch to store-2 first
      act(() => {
        result.current.switchStore('store-2');
      });

      await act(async () => {
        await result.current.deleteStorePermanently('store-1');
      });

      expect(apiClient.deleteStorePermanently).toHaveBeenCalledWith('store-1');
      expect(result.current.stores).toHaveLength(1);
      expect(result.current.stores[0].id).toBe('store-2');
    });

    it('should auto-switch to another store when current store is permanently deleted', async () => {
      vi.mocked(apiClient.getToken).mockReturnValue('test-token');
      vi.mocked(apiClient.getMe).mockResolvedValue({ user: mockUser, stores: [] });
      vi.mocked(apiClient.getStores).mockResolvedValue([mockApiStore1, mockApiStore2] as ApiStore[]);
      vi.mocked(apiClient.deleteStorePermanently).mockResolvedValue({ 
        success: true, 
        message: 'Đã xóa cửa hàng vĩnh viễn' 
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <StoreProvider>{children}</StoreProvider>
      );

      const { result } = renderHook(() => useStore(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.currentStore?.id).toBe('store-1');
      });

      await act(async () => {
        await result.current.deleteStorePermanently('store-1');
      });

      expect(result.current.currentStore?.id).toBe('store-2');
    });

    it('should set currentStore to null when last store is permanently deleted', async () => {
      vi.mocked(apiClient.getToken).mockReturnValue('test-token');
      vi.mocked(apiClient.getMe).mockResolvedValue({ user: mockUser, stores: [] });
      vi.mocked(apiClient.getStores).mockResolvedValue([mockApiStore1] as ApiStore[]);
      vi.mocked(apiClient.deleteStorePermanently).mockResolvedValue({ 
        success: true, 
        message: 'Đã xóa cửa hàng vĩnh viễn' 
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <StoreProvider>{children}</StoreProvider>
      );

      const { result } = renderHook(() => useStore(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.currentStore?.id).toBe('store-1');
      });

      await act(async () => {
        await result.current.deleteStorePermanently('store-1');
      });

      expect(result.current.currentStore).toBeNull();
      expect(result.current.stores).toHaveLength(0);
    });
  });
});
