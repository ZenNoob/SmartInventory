import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeleteStoreDialog } from './DeleteStoreDialog';
import { Store } from '@/contexts/store-context';

// Mock the store context
const mockDeleteStorePermanently = vi.fn();
vi.mock('@/contexts/store-context', () => ({
  useStore: () => ({
    deleteStorePermanently: mockDeleteStorePermanently,
    currentStore: { id: 'store-1', name: 'Test Store' },
    stores: [
      { id: 'store-1', name: 'Test Store' },
      { id: 'store-2', name: 'Other Store' },
    ],
  }),
}));

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockStore: Store = {
  id: 'store-1',
  ownerId: 'user-1',
  name: 'Test Store',
  code: 'TS',
  status: 'active',
};

describe('DeleteStoreDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render dialog with store name', () => {
    render(
      <DeleteStoreDialog
        store={mockStore}
        open={true}
        onOpenChange={() => {}}
      />
    );

    expect(screen.getByText('Xóa cửa hàng vĩnh viễn')).toBeInTheDocument();
    expect(screen.getByText(/Cảnh báo:/)).toBeInTheDocument();
  });

  it('should show warning about permanent deletion', () => {
    render(
      <DeleteStoreDialog
        store={mockStore}
        open={true}
        onOpenChange={() => {}}
      />
    );

    expect(screen.getByText(/Cảnh báo:/)).toBeInTheDocument();
    expect(screen.getByText(/Sản phẩm và danh mục/)).toBeInTheDocument();
    expect(screen.getByText(/Đơn hàng và lịch sử bán hàng/)).toBeInTheDocument();
  });

  it('should disable delete button when store name is not confirmed', () => {
    render(
      <DeleteStoreDialog
        store={mockStore}
        open={true}
        onOpenChange={() => {}}
      />
    );

    const deleteButton = screen.getByRole('button', { name: /Xóa vĩnh viễn/i });
    expect(deleteButton).toBeDisabled();
  });

  it('should enable delete button when store name is correctly entered', async () => {
    render(
      <DeleteStoreDialog
        store={mockStore}
        open={true}
        onOpenChange={() => {}}
      />
    );

    const input = screen.getByPlaceholderText('Nhập tên cửa hàng');
    fireEvent.change(input, { target: { value: 'Test Store' } });

    const deleteButton = screen.getByRole('button', { name: /Xóa vĩnh viễn/i });
    expect(deleteButton).not.toBeDisabled();
  });

  it('should call deleteStorePermanently when confirmed', async () => {
    mockDeleteStorePermanently.mockResolvedValue(undefined);
    
    render(
      <DeleteStoreDialog
        store={mockStore}
        open={true}
        onOpenChange={() => {}}
      />
    );

    const input = screen.getByPlaceholderText('Nhập tên cửa hàng');
    fireEvent.change(input, { target: { value: 'Test Store' } });

    const deleteButton = screen.getByRole('button', { name: /Xóa vĩnh viễn/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockDeleteStorePermanently).toHaveBeenCalledWith('store-1');
    });
  });

  it('should reset confirm input when dialog closes', async () => {
    const { rerender } = render(
      <DeleteStoreDialog
        store={mockStore}
        open={true}
        onOpenChange={() => {}}
      />
    );

    const input = screen.getByPlaceholderText('Nhập tên cửa hàng');
    fireEvent.change(input, { target: { value: 'Test Store' } });
    expect(input).toHaveValue('Test Store');

    // Close and reopen dialog
    rerender(
      <DeleteStoreDialog
        store={mockStore}
        open={false}
        onOpenChange={() => {}}
      />
    );

    rerender(
      <DeleteStoreDialog
        store={mockStore}
        open={true}
        onOpenChange={() => {}}
      />
    );

    const newInput = screen.getByPlaceholderText('Nhập tên cửa hàng');
    expect(newInput).toHaveValue('');
  });
});
