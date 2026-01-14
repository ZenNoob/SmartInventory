'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowRight, Plus, Trash2, Search, Loader2, Package, AlertCircle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useStore } from '@/contexts/store-context';
import { formatCurrency } from '@/lib/utils';
import { getStoresForTransfer, getProductsWithStock, transferInventory } from './actions';

interface Store {
  id: string;
  name: string;
  code: string;
  address?: string;
  status: string;
}

interface ProductWithStock {
  id: string;
  name: string;
  barcode?: string;
  unitId: string;
  unitName?: string;
  currentStock: number;
  averageCost: number;
}

interface TransferItem {
  productId: string;
  productName: string;
  quantity: number;
  unitId: string;
  unitName?: string;
  availableStock: number;
  cost: number;
}

export default function InventoryTransferPage() {
  const { currentStore, stores: contextStores } = useStore();
  const { toast } = useToast();

  // State
  const [stores, setStores] = useState<Store[]>([]);
  const [sourceStoreId, setSourceStoreId] = useState<string>('');
  const [destinationStoreId, setDestinationStoreId] = useState<string>('');
  const [sourceProducts, setSourceProducts] = useState<ProductWithStock[]>([]);
  const [transferItems, setTransferItems] = useState<TransferItem[]>([]);
  const [notes, setNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Loading states
  const [isLoadingStores, setIsLoadingStores] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Fetch stores on mount
  useEffect(() => {
    async function fetchStores() {
      setIsLoadingStores(true);
      const result = await getStoresForTransfer();
      if (result.success && result.stores) {
        setStores(result.stores);
        // Set current store as default source
        if (currentStore?.id) {
          setSourceStoreId(currentStore.id);
        }
      } else {
        toast({
          variant: 'destructive',
          title: 'Lỗi',
          description: result.error || 'Không thể tải danh sách cửa hàng',
        });
      }
      setIsLoadingStores(false);
    }
    fetchStores();
  }, [currentStore?.id, toast]);

  // Fetch products when source store changes
  const fetchSourceProducts = useCallback(async () => {
    if (!sourceStoreId) {
      setSourceProducts([]);
      return;
    }

    setIsLoadingProducts(true);
    const result = await getProductsWithStock(sourceStoreId);
    if (result.success && result.products) {
      setSourceProducts(result.products);
    } else {
      toast({
        variant: 'destructive',
        title: 'Lỗi',
        description: result.error || 'Không thể tải danh sách sản phẩm',
      });
      setSourceProducts([]);
    }
    setIsLoadingProducts(false);
  }, [sourceStoreId, toast]);

  useEffect(() => {
    fetchSourceProducts();
    // Clear transfer items when source changes
    setTransferItems([]);
  }, [fetchSourceProducts]);

  // Filter products by search term
  const filteredProducts = sourceProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Get available destination stores (exclude source store)
  const destinationStores = stores.filter((s) => s.id !== sourceStoreId);

  // Add product to transfer list
  const addProductToTransfer = (product: ProductWithStock) => {
    // Check if already added
    if (transferItems.some((item) => item.productId === product.id)) {
      toast({
        variant: 'destructive',
        title: 'Sản phẩm đã được thêm',
        description: `${product.name} đã có trong danh sách chuyển kho`,
      });
      return;
    }

    setTransferItems((prev) => [
      ...prev,
      {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitId: product.unitId,
        unitName: product.unitName,
        availableStock: product.currentStock,
        cost: product.averageCost,
      },
    ]);
  };

  // Update quantity for a transfer item
  const updateItemQuantity = (productId: string, quantity: number) => {
    setTransferItems((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          // Ensure quantity doesn't exceed available stock
          const validQuantity = Math.min(Math.max(1, quantity), item.availableStock);
          return { ...item, quantity: validQuantity };
        }
        return item;
      })
    );
  };

  // Remove item from transfer list
  const removeItem = (productId: string) => {
    setTransferItems((prev) => prev.filter((item) => item.productId !== productId));
  };

  // Calculate total value
  const totalValue = transferItems.reduce((sum, item) => sum + item.quantity * item.cost, 0);

  // Handle transfer
  const handleTransfer = async () => {
    if (!sourceStoreId || !destinationStoreId || transferItems.length === 0) {
      return;
    }

    setIsTransferring(true);
    setShowConfirmDialog(false);

    const items = transferItems.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitId: item.unitId,
    }));

    const result = await transferInventory(sourceStoreId, destinationStoreId, items, notes);

    if (result.success) {
      toast({
        title: 'Chuyển kho thành công!',
        description: `Mã phiếu: ${result.transferNumber}. Đã chuyển ${result.transferredItems?.length || 0} sản phẩm.`,
      });
      // Reset form
      setTransferItems([]);
      setNotes('');
      // Refresh products
      fetchSourceProducts();
    } else {
      toast({
        variant: 'destructive',
        title: 'Lỗi chuyển kho',
        description: result.message,
      });
    }

    setIsTransferring(false);
  };

  // Validation
  const canTransfer =
    sourceStoreId &&
    destinationStoreId &&
    transferItems.length > 0 &&
    transferItems.every((item) => item.quantity > 0 && item.quantity <= item.availableStock);

  const sourceStoreName = stores.find((s) => s.id === sourceStoreId)?.name || '';
  const destStoreName = stores.find((s) => s.id === destinationStoreId)?.name || '';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Chuyển kho</h1>
        <p className="text-muted-foreground">
          Chuyển hàng hóa giữa các cửa hàng trong cùng hệ thống
        </p>
      </div>

      {/* Store Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Chọn cửa hàng</CardTitle>
          <CardDescription>Chọn cửa hàng nguồn và cửa hàng đích để chuyển kho</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingStores ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : stores.length < 2 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Không đủ cửa hàng</AlertTitle>
              <AlertDescription>
                Cần ít nhất 2 cửa hàng để thực hiện chuyển kho. Vui lòng tạo thêm cửa hàng.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
              <div className="flex-1 space-y-2 w-full">
                <Label htmlFor="source-store">Cửa hàng nguồn</Label>
                <Select value={sourceStoreId} onValueChange={setSourceStoreId}>
                  <SelectTrigger id="source-store">
                    <SelectValue placeholder="Chọn cửa hàng nguồn" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name} ({store.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="hidden md:flex items-center justify-center px-4 pb-2">
                <ArrowRight className="h-6 w-6 text-muted-foreground" />
              </div>

              <div className="flex-1 space-y-2 w-full">
                <Label htmlFor="dest-store">Cửa hàng đích</Label>
                <Select
                  value={destinationStoreId}
                  onValueChange={setDestinationStoreId}
                  disabled={!sourceStoreId}
                >
                  <SelectTrigger id="dest-store">
                    <SelectValue placeholder="Chọn cửa hàng đích" />
                  </SelectTrigger>
                  <SelectContent>
                    {destinationStores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name} ({store.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product Selection */}
      {sourceStoreId && destinationStoreId && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Available Products */}
          <Card>
            <CardHeader>
              <CardTitle>Sản phẩm có sẵn</CardTitle>
              <CardDescription>
                Chọn sản phẩm từ cửa hàng nguồn để chuyển
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Tìm theo tên hoặc mã vạch..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {isLoadingProducts ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mb-2" />
                  <p>Không có sản phẩm nào có tồn kho</p>
                </div>
              ) : (
                <div className="max-h-[400px] overflow-y-auto space-y-2">
                  {filteredProducts.map((product) => {
                    const isAdded = transferItems.some((item) => item.productId === product.id);
                    return (
                      <div
                        key={product.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{product.name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {product.barcode && <span>{product.barcode}</span>}
                            <Badge variant="secondary">
                              Tồn: {product.currentStock} {product.unitName}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={isAdded ? 'secondary' : 'default'}
                          onClick={() => addProductToTransfer(product)}
                          disabled={isAdded}
                        >
                          {isAdded ? 'Đã thêm' : <Plus className="h-4 w-4" />}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transfer Items */}
          <Card>
            <CardHeader>
              <CardTitle>Danh sách chuyển kho</CardTitle>
              <CardDescription>
                {transferItems.length > 0
                  ? `${transferItems.length} sản phẩm sẽ được chuyển`
                  : 'Chưa có sản phẩm nào được chọn'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {transferItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mb-2" />
                  <p>Chọn sản phẩm từ danh sách bên trái</p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sản phẩm</TableHead>
                        <TableHead className="w-[120px]">Số lượng</TableHead>
                        <TableHead className="text-right">Giá trị</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transferItems.map((item) => (
                        <TableRow key={item.productId}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.productName}</p>
                              <p className="text-sm text-muted-foreground">
                                Tồn: {item.availableStock} {item.unitName}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={1}
                              max={item.availableStock}
                              value={item.quantity}
                              onChange={(e) =>
                                updateItemQuantity(item.productId, parseInt(e.target.value) || 1)
                              }
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.quantity * item.cost)}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => removeItem(item.productId)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <div className="flex justify-between items-center pt-4 border-t">
                    <span className="font-medium">Tổng giá trị:</span>
                    <span className="text-lg font-bold">{formatCurrency(totalValue)}</span>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Ghi chú</Label>
                    <Textarea
                      id="notes"
                      placeholder="Nhập ghi chú cho phiếu chuyển kho..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                    />
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => setShowConfirmDialog(true)}
                    disabled={!canTransfer || isTransferring}
                  >
                    {isTransferring ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang xử lý...
                      </>
                    ) : (
                      <>
                        <ArrowRight className="mr-2 h-4 w-4" />
                        Chuyển kho
                      </>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Confirm Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận chuyển kho</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Bạn có chắc chắn muốn chuyển <strong>{transferItems.length}</strong> sản phẩm từ{' '}
                  <strong>{sourceStoreName}</strong> sang <strong>{destStoreName}</strong>?
                </p>
                <p>Tổng giá trị: <strong>{formatCurrency(totalValue)}</strong></p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isTransferring}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleTransfer} disabled={isTransferring}>
              {isTransferring ? 'Đang xử lý...' : 'Xác nhận chuyển'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
