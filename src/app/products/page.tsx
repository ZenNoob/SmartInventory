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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog"
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
import { useCollection, useDoc, useFirestore, useMemoFirebase } from "@/firebase"
import { formatCurrency } from "@/lib/utils"
import { PredictShortageForm } from "./components/predict-shortage-form"
import { ProductForm } from "./components/product-form"
import { Category, Product, Sale, SalesItem, ThemeSettings, Unit } from "@/lib/types"
import { collection, query, getDocs, doc } from "firebase/firestore"
import { Input } from "@/components/ui/input"
import { updateProductStatus, deleteProduct, generateProductTemplate } from "./actions"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { ImportProducts } from "./components/import-products"


type ProductStatus = 'active' | 'draft' | 'archived' | 'all';
type SortKey = 'name' | 'status' | 'category' | 'avgCost' | 'stock' | 'totalValue';

export default function ProductsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>(undefined);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<ProductStatus>('all');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [isUpdating, startTransition] = useTransition();
  const [viewingLotsFor, setViewingLotsFor] = useState<Product | null>(null);
  const [isExporting, startExportingTransition] = useTransition();
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();


  const productsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "products"));
  }, [firestore]);

  const categoriesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "categories"));
  }, [firestore]);
  
  const unitsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "units"));
  }, [firestore]);

  const salesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'sales_transactions'));
  }, [firestore]);

  const settingsRef = useMemoFirebase(() => {
    if(!firestore) return null;
    return doc(firestore, 'settings', 'theme');
  }, [firestore])

  const { data: products, isLoading: productsLoading } = useCollection<Product>(productsQuery);
  const { data: categories, isLoading: categoriesLoading } = useCollection<Category>(categoriesQuery);
  const { data: units, isLoading: unitsLoading } = useCollection<Unit>(unitsQuery);
  const { data: sales, isLoading: salesLoading } = useCollection<Sale>(salesQuery);
  const { data: settings, isLoading: settingsLoading } = useDoc<ThemeSettings>(settingsRef);
  
  const [allSalesItems, setAllSalesItems] = useState<SalesItem[]>([]);
  const [salesItemsLoading, setSalesItemsLoading] = useState(true);

  const unitsMap = useMemo(() => {
    const map = new Map<string, Unit>();
    units?.forEach(u => map.set(u.id, u));
    return map;
  }, [units]);

  useEffect(() => {
    async function fetchAllSalesItems() {
      if (!firestore || !sales) return;
      
      setSalesItemsLoading(true);
      const items: SalesItem[] = [];
      for (const sale of sales) {
        const itemsCollectionRef = collection(firestore, `sales_transactions/${sale.id}/sales_items`);
        const itemsSnapshot = await getDocs(itemsCollectionRef);
        itemsSnapshot.forEach(doc => {
          items.push({ id: doc.id, ...doc.data() } as SalesItem);
        });
      }
      setAllSalesItems(items);
      setSalesItemsLoading(false);
    }
    fetchAllSalesItems();
  }, [sales, firestore]);

  const handleAddProduct = () => {
    setSelectedProduct(undefined);
    setIsFormOpen(true);
  }

  const handleEditProduct = (product: Product) => {
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
      router.refresh();
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

  const handleStatusChange = (productId: string, status: Product['status']) => {
    startTransition(async () => {
      const result = await updateProductStatus(productId, status);
      if (result.success) {
        toast({
          title: "Thành công!",
          description: "Trạng thái sản phẩm đã được cập nhật.",
        });
        router.refresh();
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

  const isLoading = productsLoading || categoriesLoading || unitsLoading || salesLoading || salesItemsLoading || settingsLoading;
  
  const getUnitInfo = useCallback((unitId: string) => {
    const unit = unitsMap.get(unitId);
    if (!unit) return { baseUnit: undefined, conversionFactor: 1, name: '' };
    
    if (unit.baseUnitId && unit.conversionFactor) {
      const baseUnit = unitsMap.get(unit.baseUnitId);
      return { baseUnit, conversionFactor: unit.conversionFactor, name: unit.name };
    }
    
    return { baseUnit: unit, conversionFactor: 1, name: unit.name };
  }, [unitsMap]);


  const getStockInfo = useCallback((product: Product) => {
    if (!product.unitId) return { stock: 0, sold: 0, stockInBaseUnit: 0, importedInBaseUnit: 0, baseUnit: undefined, mainUnit: undefined };

    const { name: mainUnitName, baseUnit: mainBaseUnit, conversionFactor: mainConversionFactor } = getUnitInfo(product.unitId);
    const mainUnit = unitsMap.get(product.unitId);
    
    let totalImportedInBaseUnit = 0;
    product.purchaseLots?.forEach(lot => {
        const { conversionFactor } = getUnitInfo(lot.unitId);
        totalImportedInBaseUnit += lot.quantity * conversionFactor;
    });
    
    const totalSoldInBaseUnit = allSalesItems
      .filter(item => item.productId === product.id)
      .reduce((acc, item) => {
         return acc + item.quantity; // a return will have a negative quantity
      }, 0);

    const stockInBaseUnit = totalImportedInBaseUnit - totalSoldInBaseUnit;
    
    const stockInMainUnit = stockInBaseUnit / (mainConversionFactor || 1);

    return { stock: stockInMainUnit, sold: totalSoldInBaseUnit, stockInBaseUnit, importedInBaseUnit: totalImportedInBaseUnit, baseUnit: mainBaseUnit || mainUnit, mainUnit };
  }, [allSalesItems, getUnitInfo, unitsMap]);

 const getAverageCost = (product: Product) => {
    if (!product.purchaseLots || product.purchaseLots.length === 0 || !product.unitId) return { avgCost: 0, baseUnit: undefined};

    let totalCost = 0;
    let totalQuantityInBaseUnit = 0;
    let costBaseUnit: Unit | undefined;

    product.purchaseLots.forEach(lot => {
        const { baseUnit, conversionFactor } = getUnitInfo(lot.unitId);
        const quantityInBaseUnit = lot.quantity * conversionFactor;
        totalCost += lot.cost * quantityInBaseUnit;
        totalQuantityInBaseUnit += quantityInBaseUnit;
        if (baseUnit) {
          costBaseUnit = baseUnit;
        } else if(unitsMap.has(lot.unitId)) {
          costBaseUnit = unitsMap.get(lot.unitId);
        }
    });
    
    if (totalQuantityInBaseUnit === 0) return { avgCost: 0, baseUnit: costBaseUnit };
    
    return { avgCost: totalCost / totalQuantityInBaseUnit, baseUnit: costBaseUnit };
  }
  
  const formatStockDisplay = (stock: number, mainUnit?: Unit, baseUnit?: Unit): string => {
    if (!mainUnit) return stock.toString();

    if (mainUnit.id !== baseUnit?.id && mainUnit.conversionFactor && baseUnit) {
        const stockInBaseUnits = stock * mainUnit.conversionFactor;
        const wholePart = Math.floor(stock);
        const fractionalPartInBase = stockInBaseUnits % mainUnit.conversionFactor;
        
        if (fractionalPartInBase > 0.01) {
            return `${wholePart} ${mainUnit.name}, ${fractionalPartInBase.toFixed(1).replace(/\.0$/, '')} ${baseUnit.name}`;
        }
        return `${wholePart} ${mainUnit.name}`;
    }
    
    return `${stock.toFixed(2).replace(/\.00$/, '')} ${mainUnit.name}`;
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedProducts = useMemo(() => {
    let sortableProducts = products?.filter(product => {
      if (statusFilter !== 'all' && product.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && product.categoryId !== categoryFilter) return false;
      
      const { stock } = getStockInfo(product);
      if (showLowStockOnly) {
        const lowStockThreshold = product.lowStockThreshold ?? settings?.lowStockThreshold ?? 0;
        if (stock > lowStockThreshold) return false;
      }

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const category = categories?.find(c => c.id === product.categoryId);
        return product.name.toLowerCase().includes(term) || (category && category.name.toLowerCase().includes(term));
      }
      return true;
    });

    if (sortableProducts && sortKey) {
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
            const categoryA = categories?.find(c => c.id === a.categoryId)?.name || '';
            const categoryB = categories?.find(c => c.id === b.categoryId)?.name || '';
            valA = categoryA.toLowerCase();
            valB = categoryB.toLowerCase();
            break;
          case 'avgCost':
            valA = getAverageCost(a).avgCost;
            valB = getAverageCost(b).avgCost;
            break;
          case 'stock':
            valA = getStockInfo(a).stock;
            valB = getStockInfo(b).stock;
            break;
          case 'totalValue':
              valA = getStockInfo(a).stockInBaseUnit * getAverageCost(a).avgCost;
              valB = getStockInfo(b).stockInBaseUnit * getAverageCost(b).avgCost;
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
  }, [products, statusFilter, categoryFilter, showLowStockOnly, searchTerm, sortKey, sortDirection, categories, getStockInfo, getAverageCost, settings]);


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


  return (
    <>
      <ProductForm 
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        product={selectedProduct}
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
       <Dialog open={!!viewingLotsFor} onOpenChange={(open) => !open && setViewingLotsFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lịch sử nhập hàng cho: {viewingLotsFor?.name}</DialogTitle>
            <DialogDescription>
              Danh sách chi tiết tất cả các lần nhập hàng cho sản phẩm này.
            </DialogDescription>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ngày nhập</TableHead>
                <TableHead className="text-right">Số lượng</TableHead>
                <TableHead>Đơn vị</TableHead>
                <TableHead className="text-right">Giá nhập</TableHead>
                <TableHead>Đơn vị giá</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {viewingLotsFor?.purchaseLots && viewingLotsFor.purchaseLots.length > 0 ? (
                viewingLotsFor.purchaseLots.map((lot, index) => {
                  const lotUnitInfo = getUnitInfo(lot.unitId);
                  const costBaseUnit = lotUnitInfo.baseUnit || unitsMap.get(lot.unitId);
                  return (
                  <TableRow key={index}>
                    <TableCell>{new Date(lot.importDate).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">{lot.quantity}</TableCell>
                    <TableCell>{lotUnitInfo.name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(lot.cost)}</TableCell>
                    <TableCell>{costBaseUnit?.name}</TableCell>
                  </TableRow>
                )})
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    Không có dữ liệu nhập hàng cho sản phẩm này.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
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
            <Button size="sm" variant="outline" className="h-8 gap-1" onClick={handleExportTemplate} disabled={isExporting}>
              <File className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                 {isExporting ? 'Đang xuất...' : 'Xuất Template'}
              </span>
            </Button>
            <ImportProducts />
            <PredictShortageForm />
            <Button size="sm" className="h-8 gap-1" onClick={handleAddProduct}>
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Thêm sản phẩm
              </span>
            </Button>
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
                    placeholder="Tìm kiếm theo tên, loại..."
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
                    <TableHead className="hidden md:table-cell">
                      Bán / Nhập
                    </TableHead>
                    <SortableHeader sortKey="stock">Tồn kho</SortableHeader>
                    <SortableHeader sortKey="totalValue">Thành tiền</SortableHeader>
                    <TableHead>
                      <span className="sr-only">Hành động</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && <TableRow><TableCell colSpan={9} className="text-center">Đang tải...</TableCell></TableRow>}
                  {!isLoading && sortedProducts?.map((product, index) => {
                    const category = categories?.find(c => c.id === product.categoryId);
                    const { stock, sold, stockInBaseUnit, baseUnit, importedInBaseUnit, mainUnit } = getStockInfo(product);
                    const { avgCost, baseUnit: costBaseUnit } = getAverageCost(product);
                    const lowStockThreshold = product.lowStockThreshold ?? settings?.lowStockThreshold ?? 0;
                    const hasPurchaseHistory = product.purchaseLots && product.purchaseLots.length > 0;
                    const mainUnitTotalImport = importedInBaseUnit / (mainUnit?.conversionFactor || 1);
                    const totalValue = stockInBaseUnit * avgCost;

                    return (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                             {stock <= lowStockThreshold && lowStockThreshold > 0 && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <AlertTriangle className="h-4 w-4 text-destructive" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Tồn kho dưới ngưỡng ({lowStockThreshold} {mainUnit?.name})</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {product.name}
                          </div>
                        </TableCell>
                         <TableCell>
                          <Badge variant={product.status === 'active' ? 'default' : product.status === 'draft' ? 'secondary' : 'outline'}>
                            {product.status === 'active' ? 'Hoạt động' : product.status === 'draft' ? 'Bản nháp' : 'Lưu trữ'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{category?.name || 'N/A'}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {formatCurrency(avgCost)} / {costBaseUnit?.name || ''}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                            <button className="underline cursor-pointer text-left text-xs" onClick={() => setViewingLotsFor(product)}>
                              <div>Đã bán: {sold.toLocaleString()} {baseUnit?.name}</div>
                               <div>
                                Đã nhập: {mainUnitTotalImport.toLocaleString()} {mainUnit?.name}
                                {mainUnit?.id !== baseUnit?.id && ` (~${importedInBaseUnit.toLocaleString()} ${baseUnit?.name})`}
                              </div>
                            </button>
                        </TableCell>
                        <TableCell className="font-medium">{formatStockDisplay(stock, mainUnit, baseUnit)}</TableCell>
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
                              <DropdownMenuItem onClick={() => handleEditProduct(product)} disabled={isUpdating}>Nhập thêm sản phẩm</DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive" 
                                onClick={() => setProductToDelete(product)} 
                                disabled={isUpdating || hasPurchaseHistory}
                              >
                                Xóa
                              </DropdownMenuItem>
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
            <CardFooter>
              <div className="text-xs text-muted-foreground">
                Hiển thị <strong>{sortedProducts?.length || 0}</strong> trên <strong>{products?.length || 0}</strong>{" "}
                sản phẩm
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  )
}
