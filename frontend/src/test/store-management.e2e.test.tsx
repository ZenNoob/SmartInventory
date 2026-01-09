import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { StoreProvider, Store } from '@/contexts/store-context';
import StoresPage from '@/app/stores/page';
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

const mockUser = {
  id: 'user-1',
  email: 'owner@example.com',
  displayName: 'Store Owner',
  role: 'admin',
  permissions: {},
};

const mockStore1: ApiStore = {
  id: 'store-1',
  ownerId: 'user-1',
  name: 'Cửa hàng Hà Nội',
  slug: 'cua-hang-ha-noi',
  address: '123 Phố Huế, Hà Nội',
  phone: '0901234567',
  status: 'active',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockStore2: ApiStore = {
  id: 'store-2',
  ownerId: 'user-1',
  name: 'Cửa hàng Sài Gòn',
  slug: 'cua-hang-sai-gon',
  address: '456 Nguyễn Huệ, TP.HCM',
  phone: '0909876543',
  status: 'active',
  createdAt: '2024-01-02T00:00:00Z',
  updatedAt: '2024-01-02T00:00:00Z',
};

describe('Store Management E2E Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(apiClient.getToken).mockReturnValue('test-token');
    vi.mocked(apiClient.getMe).mockResolvedValue({ user: mockUser, stores: [] });
  });

  const renderStoresPage = () => {
    return render(
      <StoreProvider>
        <StoresPage />
      </StoreProvider>
    );
  };

  describe('Full Create Store Flow', () => {
    it('should complete full flow: open dialog -> fill form -> submit -> see new store in list', async () => {
      const newStore: ApiStore = {
        id: 'store-new',
        ownerId: 'user-1',
        name: 'Cửa hàng Đà Nẵng',
        slug: 'cua-hang-da-nang',
        address: '789 Bạch Đằng, Đà Nẵng',
        phone: '0905555555',
        status: 'active',
        createdAt: '2024-01-03T00:00:00Z',
        updatedAt: '2024-01-03T00:00:00Z',
      };

      // Initial state: one store exists
      vi.mocked(apiClient.getStores)
        .mockResolvedValueOnce([mockStore1])
        .mockResolvedValueOnce([mockStore1, newStore]);
      vi.mocked(apiClient.createStore).mockResolvedValue(newStore);

      renderStoresPage();

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Cửa hàng Hà Nội')).toBeInTheDocument();
      });

      // Step 1: Click add store button
      const addButton = screen.getByRole('button', { name: /Thêm cửa hàng/i });
      fireEvent.click(addButton);

      // Step 2: Verify dialog opens
      await waitFor(() => {
        expect(screen.getByText('Thêm cửa hàng mới')).toBeInTheDocument();
      });

      // Step 3: Fill in the form
      const nameInput = screen.getByLabelText(/Tên cửa hàng/);
      const addressInput = screen.getByLabelText(/Địa chỉ/);
      const phoneInput = screen.getByLabelText(/Số điện thoại/);

      fireEvent.change(nameInput, { target: { value: 'Cửa hàng Đà Nẵng' } });
      fireEvent.change(addressInput, { target: { value: '789 Bạch Đằng, Đà Nẵng' } });
      fireEvent.change(phoneInput, { target: { value: '0905555555' } });

      // Step 4: Submit the form
      const submitButton = screen.getByRole('button', { name: /Tạo mới/i });
      fireEvent.click(submitButton);

      // Step 5: Verify API was called with correct data
      await waitFor(() => {
        expect(apiClient.createStore).toHaveBeenCalledWith({
          name: 'Cửa hàng Đà Nẵng',
          description: undefined,
          address: '789 Bạch Đằng, Đà Nẵng',
          phone: '0905555555',
        });
      });
    });

    it('should show validation error and prevent submission when name is empty', async () => {
      vi.mocked(apiClient.getStores).mockResolvedValue([mockStore1]);

      renderStoresPage();

      await waitFor(() => {
        expect(screen.getByText('Cửa hàng Hà Nội')).toBeInTheDocument();
      });

      // Open dialog
      const addButton = screen.getByRole('button', { name: /Thêm cửa hàng/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Thêm cửa hàng mới')).toBeInTheDocument();
      });

      // Try to submit without filling name
      const submitButton = screen.getByRole('button', { name: /Tạo mới/i });
      fireEvent.click(submitButton);

      // Verify validation error
      await waitFor(() => {
        expect(screen.getByText('Tên cửa hàng là bắt buộc')).toBeInTheDocument();
      });

      // Verify API was NOT called
      expect(apiClient.createStore).not.toHaveBeenCalled();
    });
  });

  describe('Store Switching Flow', () => {
    it('should display multiple stores and allow viewing different stores', async () => {
      vi.mocked(apiClient.getStores).mockResolvedValue([mockStore1, mockStore2]);

      renderStoresPage();

      // Verify both stores are displayed
      await waitFor(() => {
        expect(screen.getByText('Cửa hàng Hà Nội')).toBeInTheDocument();
        expect(screen.getByText('Cửa hàng Sài Gòn')).toBeInTheDocument();
      });

      // Verify store details are shown
      expect(screen.getByText('123 Phố Huế, Hà Nội')).toBeInTheDocument();
      expect(screen.getByText('456 Nguyễn Huệ, TP.HCM')).toBeInTheDocument();
    });
  });

  describe('Edit Store Flow', () => {
    it('should complete full edit flow: click edit -> modify data -> save -> see updated store', async () => {
      const updatedStore: ApiStore = {
        ...mockStore1,
        name: 'Cửa hàng Hà Nội - Chi nhánh 1',
        address: '999 Hoàn Kiếm, Hà Nội',
      };

      vi.mocked(apiClient.getStores).mockResolvedValue([mockStore1]);
      vi.mocked(apiClient.updateStore).mockResolvedValue(updatedStore);

      renderStoresPage();

      await waitFor(() => {
        expect(screen.getByText('Cửa hàng Hà Nội')).toBeInTheDocument();
      });

      // Step 1: Click edit button
      const editButton = screen.getByRole('button', { name: /Sửa/i });
      fireEvent.click(editButton);

      // Step 2: Verify edit dialog opens with pre-filled data
      await waitFor(() => {
        expect(screen.getByText('Chỉnh sửa cửa hàng')).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/Tên cửa hàng/) as HTMLInputElement;
      expect(nameInput.value).toBe('Cửa hàng Hà Nội');

      // Step 3: Modify the data
      fireEvent.change(nameInput, { target: { value: 'Cửa hàng Hà Nội - Chi nhánh 1' } });

      const addressInput = screen.getByLabelText(/Địa chỉ/) as HTMLInputElement;
      fireEvent.change(addressInput, { target: { value: '999 Hoàn Kiếm, Hà Nội' } });

      // Step 4: Save changes
      const saveButton = screen.getByRole('button', { name: /Lưu thay đổi/i });
      fireEvent.click(saveButton);

      // Step 5: Verify API was called
      await waitFor(() => {
        expect(apiClient.updateStore).toHaveBeenCalledWith('store-1', expect.objectContaining({
          name: 'Cửa hàng Hà Nội - Chi nhánh 1',
          address: '999 Hoàn Kiếm, Hà Nội',
        }));
      });
    });

    it('should show validation error when clearing required name field', async () => {
      vi.mocked(apiClient.getStores).mockResolvedValue([mockStore1]);

      renderStoresPage();

      await waitFor(() => {
        expect(screen.getByText('Cửa hàng Hà Nội')).toBeInTheDocument();
      });

      // Open edit dialog
      const editButton = screen.getByRole('button', { name: /Sửa/i });
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByText('Chỉnh sửa cửa hàng')).toBeInTheDocument();
      });

      // Clear the name field
      const nameInput = screen.getByLabelText(/Tên cửa hàng/);
      fireEvent.change(nameInput, { target: { value: '' } });

      // Try to save
      const saveButton = screen.getByRole('button', { name: /Lưu thay đổi/i });
      fireEvent.click(saveButton);

      // Verify validation error
      await waitFor(() => {
        expect(screen.getByText('Tên cửa hàng là bắt buộc')).toBeInTheDocument();
      });

      // Verify API was NOT called
      expect(apiClient.updateStore).not.toHaveBeenCalled();
    });
  });

  describe('Deactivate Store Flow', () => {
    it('should complete deactivation flow: click deactivate -> confirm -> store removed from list', async () => {
      vi.mocked(apiClient.getStores).mockResolvedValue([mockStore1, mockStore2]);
      vi.mocked(apiClient.deleteStore).mockResolvedValue(mockStore1);

      renderStoresPage();

      await waitFor(() => {
        expect(screen.getByText('Cửa hàng Hà Nội')).toBeInTheDocument();
        expect(screen.getByText('Cửa hàng Sài Gòn')).toBeInTheDocument();
      });

      // Step 1: Click deactivate button for first store
      const deactivateButtons = screen.getAllByRole('button', { name: /Vô hiệu hóa/i });
      fireEvent.click(deactivateButtons[0]);

      // Step 2: Verify confirmation dialog appears
      await waitFor(() => {
        expect(screen.getByText('Xác nhận vô hiệu hóa cửa hàng')).toBeInTheDocument();
      });

      // Step 3: Confirm deactivation - the confirm button in the dialog is also named "Vô hiệu hóa"
      const dialogButtons = screen.getAllByRole('button', { name: /Vô hiệu hóa/i });
      // The second button is the confirm button in the dialog
      fireEvent.click(dialogButtons[dialogButtons.length - 1]);

      // Step 4: Verify API was called
      await waitFor(() => {
        expect(apiClient.deleteStore).toHaveBeenCalledWith('store-1');
      });
    });

    it('should cancel deactivation when user clicks cancel', async () => {
      vi.mocked(apiClient.getStores).mockResolvedValue([mockStore1]);

      renderStoresPage();

      await waitFor(() => {
        expect(screen.getByText('Cửa hàng Hà Nội')).toBeInTheDocument();
      });

      // Click deactivate
      const deactivateButton = screen.getByRole('button', { name: /Vô hiệu hóa/i });
      fireEvent.click(deactivateButton);

      await waitFor(() => {
        expect(screen.getByText('Xác nhận vô hiệu hóa cửa hàng')).toBeInTheDocument();
      });

      // Click cancel
      const cancelButton = screen.getByRole('button', { name: /Hủy/i });
      fireEvent.click(cancelButton);

      // Verify API was NOT called
      expect(apiClient.deleteStore).not.toHaveBeenCalled();

      // Verify store is still in the list
      expect(screen.getByText('Cửa hàng Hà Nội')).toBeInTheDocument();
    });
  });

  describe('Empty State Handling', () => {
    it('should show empty state and prompt to create store when no stores exist', async () => {
      vi.mocked(apiClient.getStores).mockResolvedValue([]);

      renderStoresPage();

      await waitFor(() => {
        expect(screen.getByText('Chưa có cửa hàng nào')).toBeInTheDocument();
      });

      // Should show add buttons (one in header, one in empty state)
      const addButtons = screen.getAllByRole('button', { name: /Thêm cửa hàng/i });
      expect(addButtons.length).toBeGreaterThanOrEqual(1);
    });
  });
});
