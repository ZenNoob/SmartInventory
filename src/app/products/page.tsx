'use client'

import { useState, useTransition, useMemo, useEffect, useCallback } from "react"
import {
  File,
  ListFilter,
  MoreHorizontal,
  PlusCircle,
  Search,
  AlertTriangle,
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
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog"
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
import { Category, Product, SalesItem, ThemeSettings, Unit } from "@/lib/types"
import { collection, query, getDocs, doc } from "firebase/firestore"
import { Input } from "@/components/ui/input"
import { updateProductStatus } from "./actions"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

type ProductStatus = 'active' | 'draft' | 'archived' | 'all';


export default function ProductsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<ProductStatus>('all');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [isUpdating, startTransition] = useTransition();
  const [viewingLotsFor, setViewingLotsFor] = useState<Product | null>(null);
  
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

  const salesItemsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    // This creates a collection group query to get all sales_items across all sales_transactions
    return query(collection(firestore, 'sales_transactions'));
  }, [firestore]);

  const settingsRef = useMemoFirebase(() => {
    if(!firestore) return null;
    return doc(firestore, 'settings', 'theme');
  }, [firestore])

  const { data: products, isLoading: productsLoading } = useCollection<Product>(productsQuery);
  const { data: categories, isLoading: categoriesLoading } = useCollection<Category>(categoriesQuery);
  const { data: units, isLoading: unitsLoading } = useCollection<Unit>(unitsQuery);
  const { data: sales, isLoading: salesLoading } = useCollection(salesItemsQuery);
  const { data: settings, isLoading: settingsLoading } = useDoc<ThemeSettings>(settingsRef);
  
  const [allSalesItems, setAllSalesItems] = useState<SalesItem[]>([]);
  const [salesItemsLoading, setSalesItemsLoading] = useState(true);

  const unitsMap = useMemo(() => {
    const map = new Map<string, Unit>();
    units?.forEach(u => map.set(u.id, u));
    return map;
  }, [units]);

  const unitsByName = useMemo(() => {
    const map = new Map<string, Unit>();
    units?.forEach(u => map.set(u.name, u));
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
          items.push(doc.data() as SalesItem);
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

  const isLoading = productsLoading || categoriesLoading || unitsLoading || salesLoading || salesItemsLoading || settingsLoading;
  
  const convertToBaseUnit = useCallback((quantity: number, unitName: string): { quantity: number, baseUnit?: Unit } => {
    const unit = unitsByName.get(unitName);
    if (!unit) return { quantity, baseUnit: undefined };

    if (unit.baseUnitId && unit.conversionFactor) {
      const baseUnit = unitsMap.get(unit.baseUnitId);
      if (baseUnit) {
        // Recursively convert to the ultimate base unit
        const result = convertToBaseUnit(quantity * unit.conversionFactor, baseUnit.name);
        return { quantity: result.quantity, baseUnit: result.baseUnit || baseUnit };
      }
    }
    return { quantity, baseUnit: unit };
  }, [unitsMap, unitsByName]);

  const getStockInfo = useCallback((product: Product) => {
    let totalImportedInBase = 0;
    let baseUnit: Unit | undefined = undefined;

    product.purchaseLots?.forEach(lot => {
      const { quantity, baseUnit: lotBaseUnit } = convertToBaseUnit(lot.quantity, lot.unit);
      totalImportedInBase += quantity;
      if (lotBaseUnit && !baseUnit) {
        baseUnit = lotBaseUnit;
      }
    });

    const totalSold = allSalesItems
      .filter(item => item.productId === product.id)
      .reduce((acc, item) => acc + item.quantity, 0);

    const stock = totalImportedInBase - totalSold;
    return { stock, baseUnit, imported: totalImportedInBase, sold: totalSold };
  }, [allSalesItems, convertToBaseUnit]);

 const getAverageCost = (product: Product) => {
    if (!product.purchaseLots || product.purchaseLots.length === 0) return { avgCost: 0, baseUnit: undefined};
    
    let totalCost = 0;
    let totalQuantityInBase = 0;
    let baseUnit: Unit | undefined = undefined;

    product.purchaseLots.forEach(lot => {
        const { quantity: quantityInBase, baseUnit: lotBaseUnit } = convertToBaseUnit(lot.quantity, lot.unit);
        if(lotBaseUnit && !baseUnit) {
            baseUnit = lotBaseUnit;
        }
        // Cost is per base unit, so we multiply by the quantity in base unit
        totalCost += lot.cost * quantityInBase;
        totalQuantityInBase += quantityInBase;
    });

    if (totalQuantityInBase === 0) return { avgCost: 0, baseUnit: baseUnit };
    
    return { avgCost: totalCost / totalQuantityInBase, baseUnit: baseUnit };
  }
  
  const formatStockDisplay = (stock: number, baseUnit?: Unit): string => {
    if (!baseUnit) return stock.toString();

    // Find all units that use this base unit
    const derivedUnits = (units || [])
      .filter(u => u.baseUnitId === baseUnit.id && u.conversionFactor)
      .sort((a, b) => (b.conversionFactor || 0) - (a.conversionFactor || 0));

    let remainingStock = stock;
    const displayParts: string[] = [];

    for (const derivedUnit of derivedUnits) {
      const factor = derivedUnit.conversionFactor!;
      if (remainingStock >= factor) {
        const count = Math.floor(remainingStock / factor);
        displayParts.push(`${count} ${derivedUnit.name}`);
        remainingStock %= factor;
      }
    }

    if (remainingStock > 0 || displayParts.length === 0) {
      displayParts.push(`${remainingStock.toFixed(2).replace(/\.00$/, '')} ${baseUnit.name}`);
    }

    return displayParts.join(', ');
  };


  const filteredProducts = products?.filter(product => {
    // Status Filter
    if (statusFilter !== 'all' && product.status !== statusFilter) {
      return false;
    }
    
    // Category Filter
    if (categoryFilter !== 'all' && product.categoryId !== categoryFilter) {
      return false;
    }
    
    const { stock } = getStockInfo(product);

    // Low Stock Filter
    if (showLowStockOnly) {
        const lowStockThreshold = product.lowStockThreshold ?? settings?.lowStockThreshold ?? 0;
        if (stock > lowStockThreshold) {
            return false;
        }
    }


    // Search Term Filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const category = categories?.find(c => c.id === product.categoryId);
      const { avgCost } = getAverageCost(product);
      
      const matchesSearchTerm = (
        product.name.toLowerCase().includes(term) ||
        (category && category.name.toLowerCase().includes(term)) ||
        avgCost.toString().includes(term) ||
        formatCurrency(avgCost).toLowerCase().includes(term)
      );

      return matchesSearchTerm;
    }
    
    return true; // if no search term, return all products matching other filters
  })


  return (
    <>
      <ProductForm 
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        product={selectedProduct}
        categories={categories || []}
        units={units || []}
      />
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
                <TableHead className="text-right">Giá / ĐV cơ sở</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {viewingLotsFor?.purchaseLots && viewingLotsFor.purchaseLots.length > 0 ? (
                viewingLotsFor.purchaseLots.map((lot, index) => (
                  <TableRow key={index}>
                    <TableCell>{new Date(lot.importDate).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">{lot.quantity}</TableCell>
                    <TableCell>{lot.unit}</TableCell>
                    <TableCell className="text-right">{formatCurrency(lot.cost)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">
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
            <Button size="sm" variant="outline" className="h-8 gap-1">
              <File className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-rap">
                Xuất
              </span>
            </Button>
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
                    placeholder="Tìm kiếm theo tên, loại, giá..."
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
                    <TableHead>Tên</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Giá nhập TB
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      Bán / Nhập
                    </TableHead>
                    <TableHead>Tồn kho</TableHead>
                    <TableHead>
                      <span className="sr-only">Hành động</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && <TableRow><TableCell colSpan={8} className="text-center">Đang tải...</TableCell></TableRow>}
                  {!isLoading && filteredProducts?.map((product, index) => {
                    const category = categories?.find(c => c.id === product.categoryId);
                    const { stock, baseUnit, imported, sold } = getStockInfo(product);
                    const { avgCost, baseUnit: costBaseUnit } = getAverageCost(product);
                    const lowStockThreshold = product.lowStockThreshold ?? settings?.lowStockThreshold ?? 0;

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
                                    <p>Tồn kho dưới ngưỡng ({lowStockThreshold})</p>
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
                            <button className="underline cursor-pointer" onClick={() => setViewingLotsFor(product)}>
                              {sold} / {imported}
                            </button>
                        </TableCell>
                        <TableCell className="font-medium">{formatStockDisplay(stock, baseUnit)}</TableCell>
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
                              <DropdownMenuItem onClick={() => handleEditProduct(product)} disabled={isUpdating}>Sửa</DropdownMenuItem>
                              <DropdownMenuItem disabled={isUpdating}>Xóa</DropdownMenuItem>
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
                   {!isLoading && filteredProducts?.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={8} className="text-center h-24">
                            Không tìm thấy sản phẩm nào.
                        </TableCell>
                    </TableRow>
                )}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter>
              <div className="text-xs text-muted-foreground">
                Hiển thị <strong>{filteredProducts?.length || 0}</strong> trên <strong>{products?.length || 0}</strong>{" "}
                sản phẩm
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  )
}
