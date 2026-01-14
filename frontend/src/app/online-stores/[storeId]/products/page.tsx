'use client'

import { useState, useEffect, useCallback, useTransition } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  PlusCircle,
  Search,
  MoreHorizontal,
  Eye,
  EyeOff,
  Package,
  RefreshCw,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency } from "@/lib/utils"
import {
  getOnlineStore,
  getOnlineProducts,
  updateOnlineProduct,
  deleteOnlineProduct,
  syncOnlineStoreProducts,
  OnlineStore,
  OnlineProduct,
} from "../../actions"
import { AddProductDialog } from "./components/add-product-dialog"
import { EditProductDialog } from "./components/edit-product-dialog"

export default function OnlineProductsPage() {
  const params = useParams();
  const storeId = params.storeId as string;
  const [store, setStore] = useState<OnlineStore | null>(null);
  const [products, setProducts] = useState<OnlineProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<OnlineProduct | null>(null);
  const [productToDelete, setProductToDelete] = useState<OnlineProduct | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUpdating, startTransition] = useTransition();
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [storeResult, productsResult] = await Promise.all([
        getOnlineStore(storeId),
        getOnlineProducts(storeId),
      ]);

      if (storeResult.success && storeResult.data) {
        setStore(storeResult.data);
      }

      if (productsResult.success && productsResult.data) {
        setProducts(productsResult.data);
      } else {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: productsResult.error || "Không thể tải danh sách sản phẩm",
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [storeId, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTogglePublish = (product: OnlineProduct) => {
    startTransition(async () => {
      const result = await updateOnlineProduct(storeId, product.id, {
        isPublished: !product.isPublished,
      });
      if (result.success) {
        toast({
          title: "Thành công!",
          description: product.isPublished ? "Đã ẩn sản phẩm" : "Đã hiển thị sản phẩm",
        });
        fetchData();
      } else {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: result.error,
        });
      }
    });
  };

  const handleBulkPublish = (publish: boolean) => {
    startTransition(async () => {
      const selectedProducts = filteredProducts.filter(p => p.isPublished !== publish);
      let successCount = 0;

      for (const product of selectedProducts) {
        const result = await updateOnlineProduct(storeId, product.id, {
          isPublished: publish,
        });
        if (result.success) successCount++;
      }

      toast({
        title: "Thành công!",
        description: `Đã ${publish ? 'hiển thị' : 'ẩn'} ${successCount} sản phẩm`,
      });
      fetchData();
    });
  };

  const handleDelete = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    const result = await deleteOnlineProduct(storeId, productToDelete.id);
    if (result.success) {
      toast({
        title: "Thành công!",
        description: "Đã xóa sản phẩm khỏi danh mục online",
      });
      fetchData();
    } else {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: result.error,
      });
    }
    setIsDeleting(false);
    setProductToDelete(null);
  };

  const handleSyncProducts = async () => {
    if (!store) return;
    setIsSyncing(true);
    try {
      const result = await syncOnlineStoreProducts(storeId, undefined, store.storeId);
      if (result.success) {
        toast({
          title: "Đồng bộ thành công!",
          description: result.message || `Đã đồng bộ ${result.synced} sản phẩm`,
        });
        fetchData();
      } else {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: result.error,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Đã xảy ra lỗi khi đồng bộ sản phẩm",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredProducts = products.filter(product =>
    (product.productName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (product.productBarcode?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    product.seoSlug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const publishedCount = products.filter(p => p.isPublished).length;

  if (isLoading) {
    return <div className="p-6">Đang tải...</div>;
  }

  return (
    <>
      <AddProductDialog
        isOpen={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) fetchData();
        }}
        onlineStoreId={storeId}
      />

      <EditProductDialog
        isOpen={!!editingProduct}
        onOpenChange={(open) => {
          if (!open) {
            setEditingProduct(null);
            fetchData();
          }
        }}
        onlineStoreId={storeId}
        product={editingProduct}
      />

      <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa sản phẩm khỏi danh mục online?</AlertDialogTitle>
            <AlertDialogDescription>
              Sản phẩm <strong>{productToDelete?.productName}</strong> sẽ bị xóa khỏi cửa hàng online.
              Sản phẩm vẫn còn trong kho hàng của bạn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Đang xóa..." : "Xóa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/online-stores">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{store?.storeName || 'Cửa hàng'}</h1>
            <p className="text-muted-foreground">Quản lý sản phẩm online</p>
          </div>
          <Button variant="outline" onClick={handleSyncProducts} disabled={isSyncing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? "Đang đồng bộ..." : "Đồng bộ từ kho"}
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Thêm sản phẩm
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Sản phẩm online</CardTitle>
                <CardDescription>
                  {publishedCount} / {products.length} sản phẩm đang hiển thị
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkPublish(true)}
                  disabled={isUpdating}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Hiển thị tất cả
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkPublish(false)}
                  disabled={isUpdating}
                >
                  <EyeOff className="h-4 w-4 mr-2" />
                  Ẩn tất cả
                </Button>
              </div>
            </div>
            <div className="relative mt-4">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Tìm kiếm sản phẩm..."
                className="pl-8 md:w-1/3"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Hiển thị</TableHead>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead>Giá gốc</TableHead>
                  <TableHead>Giá online</TableHead>
                  <TableHead>Tồn kho</TableHead>
                  <TableHead>SEO Slug</TableHead>
                  <TableHead>
                    <span className="sr-only">Hành động</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-24">
                      {products.length === 0
                        ? 'Chưa có sản phẩm nào. Nhấn "Thêm sản phẩm" để bắt đầu.'
                        : 'Không tìm thấy sản phẩm phù hợp.'}
                    </TableCell>
                  </TableRow>
                )}
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <Switch
                        checked={product.isPublished}
                        onCheckedChange={() => handleTogglePublish(product)}
                        disabled={isUpdating}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="font-medium">{product.productName}</div>
                          {product.productBarcode && (
                            <div className="text-sm text-muted-foreground">
                              {product.productBarcode}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {product.sellingPrice ? formatCurrency(product.sellingPrice) : '-'}
                    </TableCell>
                    <TableCell>
                      {product.onlinePrice ? (
                        <span className="text-primary font-medium">
                          {formatCurrency(product.onlinePrice)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Giá gốc</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {product.currentStock !== undefined ? (
                        <Badge variant={product.currentStock > 0 ? "default" : "destructive"}>
                          {product.currentStock > 0 ? product.currentStock : 'Hết hàng'}
                        </Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {product.seoSlug}
                      </code>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => setEditingProduct(product)}>
                            Chỉnh sửa
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleTogglePublish(product)}>
                            {product.isPublished ? 'Ẩn sản phẩm' : 'Hiển thị sản phẩm'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setProductToDelete(product)}
                          >
                            Xóa khỏi online
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
