import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EditStoreDialog } from './EditStoreDialog';
import { StoreProvider, Store } from '@/contexts/store-context';
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
    logout: vi.fn(),
  },
}));

// Mock useToast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockStore: Store = {
  id: 'store-1',
  ownerId: 'user-1',
  name: 'Test Store',
  code: 'TS1',
  address: '123 Test Street',
  phone: '0123456789',
  businessType: 'Retail',
  status: 'active',
};

const mockApiStore: ApiStore = {
  id: 'store-1',
  ownerId: 'user-1',
  name: 'Test Store',
  address: '123 Test Street',
  phone: '0123456789',
  businessType: 'Retail',
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

describe('EditStoreDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.getToken).mockReturnValue('test-token');
    vi.mocked(apiClient.getMe).mockResolvedValue({ user: mockUser, stores: [] });
    vi.mocked(apiClient.getStores).mockResolvedValue([mockApiStore]);
  });

  const renderDialog = (props = {}) => {
    const defaultProps = {
      store: mockStore,
      open: true,
      onOpenChange: vi.fn(),
    };
    return render(
      <StoreProvider>
        <EditStoreDialog {...defaultProps} {...props} />
      </StoreProvider>
    );
  };

  it('should pre-fill form with store data', async () => {
    renderDialog();

    await waitFor(() => {
      expect(screen.getByText('Chỉnh sửa cửa hàng')).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/Tên cửa hàng/) as HTMLInputElement;
    const addressInput = screen.getByLabelText(/Địa chỉ/) as HTMLInputElement;
    const phoneInput = screen.getByLabelText(/Số điện thoại/) as HTMLInputElement;

    expect(nameInput.value).toBe('Test Store');
    expect(addressInput.value).toBe('123 Test Street');
    expect(phoneInput.value).toBe('0123456789');
  });

  it('should show validation error when name is cleared', async () => {
    renderDialog();

    await waitFor(() => {
      expect(screen.getByText('Chỉnh sửa cửa hàng')).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/Tên cửa hàng/);
    fireEvent.change(nameInput, { target: { value: '' } });

    const submitButton = screen.getByRole('button', { name: /Lưu thay đổi/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Tên cửa hàng là bắt buộc')).toBeInTheDocument();
    });
  });

  it('should call updateStore when form is valid', async () => {
    const updatedApiStore: ApiStore = { ...mockApiStore, name: 'Updated Store' };
    vi.mocked(apiClient.updateStore).mockResolvedValue(updatedApiStore);

    const onStoreUpdated = vi.fn();
    renderDialog({ onStoreUpdated });

    await waitFor(() => {
      expect(screen.getByText('Chỉnh sửa cửa hàng')).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/Tên cửa hàng/);
    fireEvent.change(nameInput, { target: { value: 'Updated Store' } });

    const submitButton = screen.getByRole('button', { name: /Lưu thay đổi/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(apiClient.updateStore).toHaveBeenCalledWith('store-1', {
        name: 'Updated Store',
        description: undefined,
        address: '123 Test Street',
        phone: '0123456789',
      });
    });
  });

  it('should close dialog when cancel button is clicked', async () => {
    const onOpenChange = vi.fn();
    renderDialog({ onOpenChange });

    await waitFor(() => {
      expect(screen.getByText('Chỉnh sửa cửa hàng')).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole('button', { name: /Hủy/i });
    fireEvent.click(cancelButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should update form when store prop changes', async () => {
    const { rerender } = renderDialog();

    await waitFor(() => {
      expect(screen.getByText('Chỉnh sửa cửa hàng')).toBeInTheDocument();
    });

    const newStore: Store = {
      ...mockStore,
      id: 'store-2',
      name: 'Another Store',
      address: '456 Another Street',
    };

    rerender(
      <StoreProvider>
        <EditStoreDialog store={newStore} open={true} onOpenChange={vi.fn()} />
      </StoreProvider>
    );

    await waitFor(() => {
      const nameInput = screen.getByLabelText(/Tên cửa hàng/) as HTMLInputElement;
      expect(nameInput.value).toBe('Another Store');
    });
  });
});
