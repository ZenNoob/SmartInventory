import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StoresPage from './page';
import { StoreProvider } from '@/contexts/store-context';
import { apiClient, Store as ApiStore } from '@/lib/api-client';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

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
    logout: vi.fn(),
  },
}));

// Mock useToast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockApiStore1: ApiStore = {
  id: 'store-1',
  ownerId: 'user-1',
  name: 'Store 1',
  address: '123 Main St',
  phone: '0123456789',
  status: 'active',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockApiStore2: ApiStore = {
  id: 'store-2',
  ownerId: 'user-1',
  name: 'Store 2',
  status: 'active',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  displayName: 'Test User',
  role: 'admin',
  permissions: {},
};

describe('StoresPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.getToken).mockReturnValue('test-token');
    vi.mocked(apiClient.getMe).mockResolvedValue({ user: mockUser, stores: [] });
  });

  const renderPage = () => {
    return render(
      <StoreProvider>
        <StoresPage />
      </StoreProvider>
    );
  };

  it('should display list of stores', async () => {
    vi.mocked(apiClient.getStores).mockResolvedValue([mockApiStore1, mockApiStore2]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Store 1')).toBeInTheDocument();
      expect(screen.getByText('Store 2')).toBeInTheDocument();
    });
  });

  it('should show empty state when no stores exist', async () => {
    vi.mocked(apiClient.getStores).mockResolvedValue([]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Chưa có cửa hàng nào')).toBeInTheDocument();
    });
  });

  it('should show add store button for admin users', async () => {
    vi.mocked(apiClient.getStores).mockResolvedValue([mockApiStore1]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Thêm cửa hàng/i })).toBeInTheDocument();
    });
  });

  it('should open create dialog when add button is clicked', async () => {
    vi.mocked(apiClient.getStores).mockResolvedValue([mockApiStore1]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Thêm cửa hàng/i })).toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', { name: /Thêm cửa hàng/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Thêm cửa hàng mới')).toBeInTheDocument();
    });
  });

  it('should show edit and deactivate buttons for each store', async () => {
    vi.mocked(apiClient.getStores).mockResolvedValue([mockApiStore1]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Sửa/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Vô hiệu hóa/i })).toBeInTheDocument();
    });
  });

  it('should open edit dialog when edit button is clicked', async () => {
    vi.mocked(apiClient.getStores).mockResolvedValue([mockApiStore1]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Sửa/i })).toBeInTheDocument();
    });

    const editButton = screen.getByRole('button', { name: /Sửa/i });
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByText('Chỉnh sửa cửa hàng')).toBeInTheDocument();
    });
  });

  it('should open deactivate confirmation when deactivate button is clicked', async () => {
    vi.mocked(apiClient.getStores).mockResolvedValue([mockApiStore1]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Vô hiệu hóa/i })).toBeInTheDocument();
    });

    const deactivateButton = screen.getByRole('button', { name: /Vô hiệu hóa/i });
    fireEvent.click(deactivateButton);

    await waitFor(() => {
      expect(screen.getByText('Xác nhận vô hiệu hóa cửa hàng')).toBeInTheDocument();
    });
  });

  it('should display store address and phone when available', async () => {
    vi.mocked(apiClient.getStores).mockResolvedValue([mockApiStore1]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('123 Main St')).toBeInTheDocument();
      expect(screen.getByText('0123456789')).toBeInTheDocument();
    });
  });
});
