import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateStoreDialog } from './CreateStoreDialog';
import { StoreProvider } from '@/contexts/store-context';
import { apiClient } from '@/lib/api-client';

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

const mockStore = {
  id: 'store-1',
  ownerId: 'user-1',
  name: 'Test Store',
  code: 'TS1',
  status: 'active' as const,
};

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  displayName: 'Test User',
  role: 'admin',
  permissions: {},
};

describe('CreateStoreDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.getToken).mockReturnValue('test-token');
    vi.mocked(apiClient.getMe).mockResolvedValue({ user: mockUser, stores: [] });
    vi.mocked(apiClient.getStores).mockResolvedValue([]);
  });

  const renderDialog = (props = {}) => {
    const defaultProps = {
      open: true,
      onOpenChange: vi.fn(),
    };
    return render(
      <StoreProvider>
        <CreateStoreDialog {...defaultProps} {...props} />
      </StoreProvider>
    );
  };

  it('should render dialog with form fields', async () => {
    renderDialog();

    await waitFor(() => {
      expect(screen.getByText('Thêm cửa hàng mới')).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/Tên cửa hàng/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Mô tả/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Địa chỉ/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Số điện thoại/)).toBeInTheDocument();
  });

  it('should show validation error when name is empty', async () => {
    renderDialog();

    await waitFor(() => {
      expect(screen.getByText('Thêm cửa hàng mới')).toBeInTheDocument();
    });

    const submitButton = screen.getByRole('button', { name: /Tạo mới/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Tên cửa hàng là bắt buộc')).toBeInTheDocument();
    });
  });

  it('should show validation error when name exceeds 255 characters', async () => {
    renderDialog();

    await waitFor(() => {
      expect(screen.getByText('Thêm cửa hàng mới')).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/Tên cửa hàng/);
    const longName = 'a'.repeat(256);
    fireEvent.change(nameInput, { target: { value: longName } });

    const submitButton = screen.getByRole('button', { name: /Tạo mới/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Tên cửa hàng không được quá 255 ký tự')).toBeInTheDocument();
    });
  });

  it('should call createStore when form is valid', async () => {
    vi.mocked(apiClient.createStore).mockResolvedValue(mockStore);
    vi.mocked(apiClient.getStores).mockResolvedValue([mockStore]);

    const onStoreCreated = vi.fn();
    renderDialog({ onStoreCreated });

    await waitFor(() => {
      expect(screen.getByText('Thêm cửa hàng mới')).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/Tên cửa hàng/);
    fireEvent.change(nameInput, { target: { value: 'New Store' } });

    const submitButton = screen.getByRole('button', { name: /Tạo mới/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(apiClient.createStore).toHaveBeenCalledWith({
        name: 'New Store',
        description: undefined,
        address: undefined,
        phone: undefined,
      });
    });
  });

  it('should close dialog when cancel button is clicked', async () => {
    const onOpenChange = vi.fn();
    renderDialog({ onOpenChange });

    await waitFor(() => {
      expect(screen.getByText('Thêm cửa hàng mới')).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole('button', { name: /Hủy/i });
    fireEvent.click(cancelButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
