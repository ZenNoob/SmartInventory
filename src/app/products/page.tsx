'use client'

import { useState, useTransition, useMemo, useCallback, useEffect } from "react"
import {
  File,
  ListFilter,
  MoreHorizontal,
  PlusCircle,
  Search,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import { PredictShortageForm } from "./components/predict-shortage-form"
import { ProductForm } from "./components/product-form"
import { Category, Unit, ThemeSettings } from "@/lib/types"
import { Input } from "@/components/ui/input"
import { getProducts, updateProductStatus, deleteProduct, generateProductTemplate } from "./actions"
import { getCategories } from "@/app/categories/actions"
import { getUnits } from "@/app/units/actions"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { ImportProducts } from "./components/import-products"
import { useUserRole } from "@/hooks/use-user-role"


// Product type from SQL Server API
interface ProductWithStock {
  id: string;
  storeId: string;
  name: string;
  barcode?: string;
  description?: string;
  categoryId: string;
  unitId: string;
  sellingPrice?: number;
  status: 'active' | 'draft' | 'archived';
  lowStockThreshold?: number;
  createdAt: string;
  updatedAt: string;
  currentStock: number;
  averageCost: number;
  categoryName?: string;
  unitName?: string;
}

type ProductStatus = 'active' | 'draft' | 'archived' | 'all';
type SortKey = 'name' | 'status' | 'category' | 'avgCost' | 'stock' | 'totalValue';

export default function ProductsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithStock | undefined>(undefined);
  const [productToDelete, setProductToDelete] = useState<ProductWithStock | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<ProductStatus>('all');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [isUpdating, startTransition] = useTransition();
  const [isExporting, startExportingTransition] = useTransition();
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  
  // Data state
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { toast } = useToast();
  const router = useRouter();
  const { permissions, isLoading: isRoleLoading } = useUserRole();

  // Fetch products from SQL Server API
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getProducts({
        page: currentPage,
        pageSize,
        search: searchTerm || undefined,
        categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      
      if (result.success && result.data) {
        setProducts(result.data);
        setTotalPages(result.totalPages || 1);
        setTotalProducts(result.total || 0);
      } else {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: result.error || "Không thể tải danh sách sản phẩm",
        });
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, categoryFilter, statusFilter, toast]);

  // Fetch categories and units
  const fetchCategoriesAndUnits = useCallback(async () => {
    try {
      const [categoriesResult, unitsResult] = await Promise.all([
        getCategories(),
        getUnits(),
      ]);
      
      if (categoriesResult.success && categoriesResult.categories) {
        setCategories(categoriesResult.categories);
      }
      
      if (unitsResult.success && unitsResult.units) {
        setUnits(unitsResult.units);
      }
    } catch (error) {
      console.error('Error fetching categories/units:', error);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchCategoriesAndUnits();
  }, [fetchCategoriesAndUnits]);

  // Fetch products when filters change
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, statusFilter]);

  const unitsMap = useMemo(() => {
    const map = new Map<string, Unit>();
    units?.forEach(u => map.set(u.id, u));
    return map;
  }, [units]);


  const handleAddProduct = () => {
    setSelectedProduct(undefined);
    setIsFormOpen(true);
  }

  const handleEditProduct = (product: ProductWithStock) => {
    setSelectedProduct(product);
    setIsFormOpen(true);
  }

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    const result = await deleteProduct(productToDelete.id);
    if (result.success) {
      toast({
        title: "Thành công!",
        description: `Đã xóa sản phẩm "${productToDelete.name}".`,
      });
      fetchProducts();
    } else {
      toast({
        variant: "destructive",
        title: "Ôi! Đã có lỗi xảy ra.",
        description: result.error,
      });
    }
    setIsDeleting(false);
    setProductToDelete(null);
  };

  const handleStatusChange = (productId: string, status: 'active' | 'draft' | 'archived') => {
    startTransition(async () => {
      const result = await updateProductStatus(productId, status);
      if (result.success) {
        toast({
          title: "Thành công!",
          description: "Trạng thái sản phẩm đã được cập nhật.",
        });
        fetchProducts();
      } else {
        toast({
          variant: "destructive",
          title: "Ôi! Đã có lỗi xảy ra.",
          description: result.error,
        });
      }
    });
  }

  const handleExportTemplate = () => {
    startExportingTransition(async () => {
      const result = await generateProductTemplate();
      if (result.success && result.data) {
        const link = document.createElement("a");
        link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${result.data}`;
        link.download = "product_template.xlsx";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: "Thành công", description: "Đã tải xuống file mẫu." });
      } else {
        toast({ variant: "destructive", title: "Lỗi", description: result.error });
      }
    });
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  // Sort products locally (since API already returns paginated data)
  const sortedProducts = useMemo(() => {
    let sortableProducts = [...products];
    
    // Filter by low stock if enabled
    if (showLowStockOnly) {
      sortableProducts = sortableProducts.filter(product => {
        const threshold = product.lowStockThreshold ?? 10;
        return (product.currentStock ?? 0) <= threshold;
      });
    }

    if (sortKey) {
      sortableProducts.sort((a, b) => {
        let valA: string | number, valB: string | number;

        switch (sortKey) {
          case 'name':
            valA = a.name.toLowerCase();
            valB = b.name.toLowerCase();
            break;
          case 'status':
            valA = a.status;
            valB = b.status;
            break;
          case 'category':
            valA = (a.categoryName || '').toLowerCase();
            valB = (b.categoryName || '').toLowerCase();
            break;
          case 'avgCost':
            valA = a.averageCost ?? 0;
            valB = b.averageCost ?? 0;
            break;
          case 'stock':
            valA = a.currentStock ?? 0;
            valB = b.currentStock ?? 0;
            break;
          case 'totalValue':
            valA = (a.currentStock ?? 0) * (a.averageCost ?? 0);
            valB = (b.currentStock ?? 0) * (b.averageCost ?? 0);
            break;
          default:
            return 0;
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return sortableProducts;
  }, [products, showLowStockOnly, sortKey, sortDirection]);


  const SortableHeader = ({ sortKey: key, children, className }: { sortKey: SortKey, children: React.ReactNode, className?: string }) => (
    <TableHead className={className}>
      <Button variant="ghost" onClick={() => handleSort(key)} className="px-2 py-1 h-auto">
        {children}
        {sortKey === key && (
          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 ml-2" /> : <ArrowDown className="h-4 w-4 ml-2" />
        )}
      </Button>
    </TableHead>
  );

  const canAdd = permissions?.products?.includes('add');
  const canEdit = permissions?.products?.includes('edit');
  const canDelete = permissions?.products?.includes('delete');
  const canView = permissions?.products?.includes('view');

  if (isLoading || isRoleLoading) {
    return <p>Đang tải...</p>;
  }

  if (!canView) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Truy cập bị từ chối</CardTitle>
          <CardDescription>
            Bạn không có quyền xem trang sản phẩm.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Convert ProductWithStock to Product format for the form
  const productForForm = selectedProduct ? {
    id: selectedProduct.id,
    name: selectedProduct.name,
    barcode: selectedProduct.barcode,
    description: selectedProduct.description,
    categoryId: selectedProduct.categoryId,
    unitId: selectedProduct.unitId,
    sellingPrice: selectedProduct.sellingPrice,
    status: selectedProduct.status,
    lowStockThreshold: selectedProduct.lowStockThreshold,
    purchaseLots: [], // Purchase lots are managed separately in SQL Server
  } : undefined;

  return (
    <>
      <ProductForm 
        isOpen={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) {
            fetchProducts(); // Refresh after form closes
          }
        }}
        product={productForForm}
        categories={categories || []}
        units={units || []}
      />
      <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn không?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể được hoàn tác. Thao tác này sẽ xóa vĩnh viễn sản phẩm{' '}
              <strong>{productToDelete?.name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProduct} disabled={isDeleting}>
              {isDeleting ? "Đang xóa..." : "Xóa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <Tabs defaultValue="all" onValueChange={(value) => setStatusFilter(value as ProductStatus)}>
        <div className="flex items-center">
          <TabsList>
            <TabsTrigger value="all">Tất cả</TabsTrigger>
            <TabsTrigger value="active">Hoạt động</TabsTrigger>
            <TabsTrigger value="draft">Bản nháp</TabsTrigger>
            <TabsTrigger value="archived" className="hidden sm:flex">
              Lưu trữ
            </TabsTrigger>
          </TabsList>
          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  <ListFilter className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Lọc
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Lọc theo loại</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={categoryFilter} onValueChange={setCategoryFilter}>
                  <DropdownMenuRadioItem value="all">Tất cả các loại</DropdownMenuRadioItem>
                  {categories?.map((category) => (
                    <DropdownMenuRadioItem key={category.id} value={category.id}>
                      {category.name}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={showLowStockOnly}
                  onCheckedChange={setShowLowStockOnly}
                >
                  Chỉ hiển thị sản phẩm dưới ngưỡng tồn
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {canAdd && (
            <>
              <Button size="sm" variant="outline" className="h-8 gap-1" onClick={handleExportTemplate} disabled={isExporting}>
                <File className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  {isExporting ? 'Đang xuất...' : 'Xuất Template'}
                </span>
              </Button>
              <ImportProducts />
            </>
            )}
            {permissions?.ai_forecast?.includes('view') && <PredictShortageForm />}
            {canAdd && (
              <Button size="sm" className="h-8 gap-1" onClick={handleAddProduct}>
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Thêm sản phẩm
                </span>
              </Button>
            )}
          </div>
        </div>

        <TabsContent value={statusFilter}>
          <Card>
            <CardHeader>
              <CardTitle>Sản phẩm</CardTitle>
              <CardDescription>
                Quản lý sản phẩm của bạn và xem hiệu suất bán hàng của chúng.
              </CardDescription>
              <div className="relative mt-4">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Tìm kiếm theo tên, mã vạch..."
                  className="w-full rounded-lg bg-background pl-8 md:w-1/3"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">STT</TableHead>
                    <SortableHeader sortKey="name">Tên</SortableHeader>
                    <SortableHeader sortKey="status">Trạng thái</SortableHeader>
                    <SortableHeader sortKey="category">Loại</SortableHeader>
                    <SortableHeader sortKey="avgCost" className="hidden md:table-cell">Giá nhập TB</SortableHeader>
                    <TableHead className="hidden md:table-cell">Giá bán</TableHead>
                    <SortableHeader sortKey="stock">Tồn kho</SortableHeader>
                    <SortableHeader sortKey="totalValue">Thành tiền</SortableHeader>
                    <TableHead>
                      <span className="sr-only">Hành động</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center">Đang tải...</TableCell>
                    </TableRow>
                  )}
                  {!isLoading && sortedProducts?.map((product, index) => {
                    const lowStockThreshold = product.lowStockThreshold ?? 10;
                    const currentStock = product.currentStock ?? 0;
                    const averageCost = product.averageCost ?? 0;
                    const isLowStock = currentStock <= lowStockThreshold;
                    const totalValue = currentStock * averageCost;
                    const unit = unitsMap.get(product.unitId);

                    return (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">
                          {(currentPage - 1) * pageSize + index + 1}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {isLowStock && lowStockThreshold > 0 && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <AlertTriangle className="h-4 w-4 text-destructive" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Tồn kho dưới ngưỡng ({lowStockThreshold} {unit?.name || ''})</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            <div>
                              <div>{product.name}</div>
                              {product.barcode && (
                                <div className="text-xs text-muted-foreground">{product.barcode}</div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.status === 'active' ? 'default' : product.status === 'draft' ? 'secondary' : 'outline'}>
                            {product.status === 'active' ? 'Hoạt động' : product.status === 'draft' ? 'Bản nháp' : 'Lưu trữ'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{product.categoryName || 'N/A'}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {formatCurrency(product.averageCost)} / {unit?.name || ''}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {product.sellingPrice ? formatCurrency(product.sellingPrice) : '-'}
                        </TableCell>
                        <TableCell className="font-medium">
                          {currentStock.toFixed(2).replace(/\.00$/, '')} {unit?.name || ''}
                        </TableCell>
                        <TableCell className="font-medium">{formatCurrency(totalValue)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                aria-haspopup="true"
                                size="icon"
                                variant="ghost"
                                disabled={isUpdating}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Chuyển đổi menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                              {canEdit && (
                                <DropdownMenuItem onClick={() => handleEditProduct(product)} disabled={isUpdating}>
                                  Chỉnh sửa
                                </DropdownMenuItem>
                              )}
                              {canDelete && (
                                <DropdownMenuItem 
                                  className="text-destructive" 
                                  onClick={() => setProductToDelete(product)} 
                                  disabled={isUpdating}
                                >
                                  Xóa
                                </DropdownMenuItem>
                              )}
                              {canEdit && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuLabel>Thay đổi trạng thái</DropdownMenuLabel>
                                  <DropdownMenuItem 
                                    onClick={() => handleStatusChange(product.id, 'active')}
                                    disabled={product.status === 'active' || isUpdating}
                                  >
                                    Chuyển sang Hoạt động
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleStatusChange(product.id, 'draft')}
                                    disabled={product.status === 'draft' || isUpdating}
                                  >
                                    Chuyển sang Bản nháp
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleStatusChange(product.id, 'archived')}
                                    disabled={product.status === 'archived' || isUpdating}
                                  >
                                    Chuyển sang Lưu trữ
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {!isLoading && sortedProducts?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center h-24">
                        Không tìm thấy sản phẩm nào.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>

            <CardFooter className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                Hiển thị <strong>{sortedProducts?.length || 0}</strong> trên <strong>{totalProducts}</strong>{" "}
                sản phẩm
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Trước
                  </Button>
                  <span className="text-sm">
                    Trang {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Sau
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  )
}
