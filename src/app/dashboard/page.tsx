'use client'

import {
  DollarSign,
  Users,
  CreditCard,
  Package,
  Calendar as CalendarIcon,
  File,
  Boxes,
} from "lucide-react"
import Link from "next/link"
import { useState, useMemo, useEffect, useCallback } from "react"
import { DateRange } from "react-day-picker"
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns"
import * as xlsx from 'xlsx';


import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
  DialogDescription,
  DialogTrigger
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { cn, formatCurrency } from "@/lib/utils"
import { Customer, Sale, Payment, Product, SalesItem, Unit, Category } from "@/lib/types"
import { collection, query, getDocs } from "firebase/firestore"
import { RevenueChart } from "../reports/revenue/components/revenue-chart"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export type MonthlyRevenue = {
  month: string;
  revenue: number;
  salesCount: number;
}

type SoldProductInfo = {
  productId: string;
  productName: string;
  totalQuantity: number;
  totalRevenue: number;
  baseUnitName: string;
};


export default function Dashboard() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [isInventoryDetailOpen, setIsInventoryDetailOpen] = useState(false);

  const firestore = useFirestore();

  const customersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, "customers")) : null, [firestore]);
  const salesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, "sales_transactions")) : null, [firestore]);
  const paymentsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, "payments")) : null, [firestore]);
  const productsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, "products")) : null, [firestore]);
  const unitsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, "units")) : null, [firestore]);
  const categoriesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, "categories")) : null, [firestore]);
  
  const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersQuery);
  const { data: sales, isLoading: salesLoading } = useCollection<Sale>(salesQuery);
  const { data: payments, isLoading: paymentsLoading } = useCollection<Payment>(paymentsQuery);
  const { data: products, isLoading: productsLoading } = useCollection<Product>(productsQuery);
  const { data: units, isLoading: unitsLoading } = useCollection<Unit>(unitsQuery);
  const { data: categories, isLoading: categoriesLoading } = useCollection<Category>(categoriesQuery);

  const [allSalesItems, setAllSalesItems] = useState<SalesItem[]>([]);
  const [salesItemsLoading, setSalesItemsLoading] = useState(true);
  
  const productsMap = useMemo(() => new Map(products?.map(p => [p.id, p])), [products]);
  const unitsMap = useMemo(() => new Map(units?.map(u => [u.id, u])), [units]);
  const categoriesMap = useMemo(() => new Map(categories?.map(c => [c.id, c.name])), [categories]);


  const filteredSales = useMemo(() => {
    if (!sales) return [];
    if (!dateRange?.from) return sales;

    const fromDate = dateRange.from;
    const toDate = dateRange.to || fromDate;

    return sales.filter(sale => {
      const saleDate = new Date(sale.transactionDate);
      return saleDate >= fromDate && saleDate <= toDate;
    });
  }, [sales, dateRange]);


  useEffect(() => {
    async function fetchAllSalesItems() {
      if (!firestore || !sales) { // Fetch for all sales, not just filtered ones
        if (!salesLoading) setSalesItemsLoading(false);
        return;
      }

      setSalesItemsLoading(true);
      const items: SalesItem[] = [];
      try {
        for (const sale of sales) {
          const itemsCollectionRef = collection(firestore, `sales_transactions/${sale.id}/sales_items`);
          const itemsSnapshot = await getDocs(itemsCollectionRef);
          itemsSnapshot.forEach(doc => {
            items.push({ id: doc.id, ...doc.data() } as SalesItem);
          });
        }
        setAllSalesItems(items);
      } catch (error) {
        console.error("Error fetching sales items:", error);
      } finally {
        setSalesItemsLoading(false);
      }
    }
    fetchAllSalesItems();
  }, [firestore, sales, salesLoading]);
  
  const isLoading = customersLoading || salesLoading || paymentsLoading || productsLoading || unitsLoading || salesItemsLoading || categoriesLoading;

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
      .reduce((acc, item) => acc + item.quantity, 0);

    const stockInBaseUnit = totalImportedInBaseUnit - totalSoldInBaseUnit;
    const stockInMainUnit = stockInBaseUnit / (mainConversionFactor || 1);

    return { stock: stockInMainUnit, sold: totalSoldInBaseUnit, stockInBaseUnit, importedInBaseUnit: totalImportedInBaseUnit, baseUnit: mainBaseUnit || mainUnit, mainUnit };
  }, [allSalesItems, getUnitInfo, unitsMap]);

  const formatStockDisplay = (stock: number, mainUnit?: Unit, baseUnit?: Unit): string => {
    if (!mainUnit) return stock.toString();

    if (mainUnit.id !== baseUnit?.id && mainUnit.conversionFactor && baseUnit) {
        const stockInBaseUnits = stock * mainUnit.conversionFactor;
        const wholePart = Math.floor(stock);
        const fractionalPartInBase = stockInBaseUnits % mainUnit.conversionFactor;
        
        if (fractionalPartInBase > 0.01) {
            return `${wholePart.toLocaleString()} ${mainUnit.name}, ${fractionalPartInBase.toFixed(1).replace(/\.0$/, '')} ${baseUnit.name}`;
        }
        return `${wholePart.toLocaleString()} ${mainUnit.name}`;
    }
    
    return `${stock.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${mainUnit.name}`;
  };

  const inventoryData = useMemo(() => {
    if (!products) return [];
    return products.map(product => {
      const { stock, mainUnit, baseUnit } = getStockInfo(product);
      return {
        product,
        stockDisplay: formatStockDisplay(stock, mainUnit, baseUnit),
        stock,
      };
    }).sort((a,b) => a.stock - b.stock); // Sort by lowest stock
  }, [products, getStockInfo]);

  const inventoryByCategory = useMemo(() => {
    if (isLoading) return new Map<string, typeof inventoryData>();
    const grouped = new Map<string, typeof inventoryData>();
    inventoryData.forEach(item => {
      const categoryId = item.product.categoryId;
      const categoryItems = grouped.get(categoryId) || [];
      categoryItems.push(item);
      grouped.set(categoryId, categoryItems);
    });
    return grouped;
  }, [inventoryData, isLoading]);


  // Memoized calculations
  const totalRevenue = useMemo(() => filteredSales.reduce((acc, sale) => acc + sale.finalAmount, 0), [filteredSales]);
  const totalSalesCount = filteredSales.length;

  const totalDebt = useMemo(() => {
    if (!customers || !sales || !payments) return 0;
    return customers.reduce((total, customer) => {
      const customerSales = sales.filter(s => s.customerId === customer.id).reduce((sum, s) => sum + (s.finalAmount || 0), 0);
      const customerPayments = payments.filter(p => p.customerId === customer.id).reduce((sum, p) => sum + p.amount, 0);
      const debt = customerSales - customerPayments;
      return total + (debt > 0 ? debt : 0);
    }, 0);
  }, [customers, sales, payments]);
  
  const monthlyData = useMemo((): MonthlyRevenue[] => {
    const monthlyTotals: { [key: string]: { revenue: number; salesCount: number } } = {};
    filteredSales.forEach(sale => {
      const month = format(new Date(sale.transactionDate), "yyyy-MM");
      if (!monthlyTotals[month]) {
        monthlyTotals[month] = { revenue: 0, salesCount: 0 };
      }
      monthlyTotals[month].revenue += sale.finalAmount;
      monthlyTotals[month].salesCount += 1;
    });

    return Object.entries(monthlyTotals)
      .map(([month, data]) => ({ ...data, month }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredSales]);

  const soldProductsData = useMemo((): SoldProductInfo[] => {
    const itemsInDateRange = allSalesItems.filter(item => {
        const sale = sales?.find(s => s.id === item.salesTransactionId);
        if (!sale || !dateRange?.from) return false;
        const saleDate = new Date(sale.transactionDate);
        const toDate = dateRange.to || dateRange.from;
        return saleDate >= dateRange.from && saleDate <= toDate;
    });

    if (itemsInDateRange.length === 0) return [];

    const productSalesMap = new Map<string, { totalQuantity: number; totalRevenue: number }>();

    itemsInDateRange.forEach(item => {
      const existing = productSalesMap.get(item.productId) || { totalQuantity: 0, totalRevenue: 0 };
      existing.totalQuantity += item.quantity;
      existing.totalRevenue += item.quantity * item.price;
      productSalesMap.set(item.productId, existing);
    });

    const results: SoldProductInfo[] = [];
    productSalesMap.forEach((data, productId) => {
      const product = productsMap.get(productId);
      if (product) {
        const mainUnit = unitsMap.get(product.unitId);
        const baseUnit = mainUnit?.baseUnitId ? unitsMap.get(mainUnit.baseUnitId) : mainUnit;
        results.push({
          productId,
          productName: product.name,
          totalQuantity: data.totalQuantity,
          totalRevenue: data.totalRevenue,
          baseUnitName: baseUnit?.name || 'N/A',
        });
      }
    });

    return results.sort((a,b) => b.totalRevenue - a.totalRevenue);
  }, [allSalesItems, productsMap, unitsMap, sales, dateRange]);


  const setDatePreset = (preset: 'this_week' | 'this_month' | 'this_year') => {
    const now = new Date();
    switch (preset) {
      case 'this_week':
        setDateRange({ from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) });
        break;
      case 'this_month':
        setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
        break;
      case 'this_year':
        setDateRange({ from: startOfYear(now), to: endOfYear(now) });
        break;
    }
  }

  const handleExportExcel = () => {
    const wb = xlsx.utils.book_new();

    // Sheet 1: Revenue
    const revenueData = monthlyData.map(d => ({ 'Tháng': d.month, 'Số đơn': d.salesCount, 'Doanh thu': d.revenue }));
    const revenueTotal = { 'Tháng': 'Tổng', 'Số đơn': totalSalesCount, 'Doanh thu': totalRevenue };
    const ws1 = xlsx.utils.json_to_sheet([...revenueData, revenueTotal]);
    xlsx.utils.book_append_sheet(wb, ws1, "DoanhThu");

    // Sheet 2: Sold Products
    const productsData = soldProductsData.map(p => ({ 'Sản phẩm': p.productName, 'Số lượng bán': `${p.totalQuantity.toLocaleString()} ${p.baseUnitName}`, 'Doanh thu': p.totalRevenue }));
    const ws2 = xlsx.utils.json_to_sheet(productsData);
    xlsx.utils.book_append_sheet(wb, ws2, "SPBanChay");

    xlsx.writeFile(wb, `Report_${format(dateRange?.from || new Date(), 'yyyy-MM-dd')}_${format(dateRange?.to || new Date(), 'yyyy-MM-dd')}.xlsx`);
  }

  return (
    <Dialog open={isInventoryDetailOpen} onOpenChange={setIsInventoryDetailOpen}>
      <div className="flex flex-col gap-6">
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chi tiết tồn kho</DialogTitle>
            <DialogDescription>
              Danh sách sản phẩm trong kho được nhóm theo danh mục.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            {isLoading ? (
              <p>Đang tải dữ liệu tồn kho...</p>
            ) : (
              <Accordion type="multiple" className="w-full" defaultValue={Array.from(inventoryByCategory.keys())}>
                {categories?.filter(c => inventoryByCategory.has(c.id)).map(category => (
                  <AccordionItem value={category.id} key={category.id}>
                    <AccordionTrigger>{category.name} ({inventoryByCategory.get(category.id)?.length} sản phẩm)</AccordionTrigger>
                    <AccordionContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Sản phẩm</TableHead>
                            <TableHead className="text-right">Tồn kho</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {inventoryByCategory.get(category.id)?.map(({ product, stockDisplay }) => (
                            <TableRow key={product.id}>
                              <TableCell>
                                <Link href={`/products?q=${product.name}`} className="font-medium hover:underline">
                                  {product.name}
                                </Link>
                              </TableCell>
                              <TableCell className="text-right">{stockDisplay}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </ScrollArea>
        </DialogContent>


        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-2xl font-semibold">Phân tích kinh doanh</h1>
          <div className="flex flex-wrap items-center gap-2 ml-auto">
            <Popover>
              <PopoverTrigger asChild>
                <Button id="date" variant={"outline"} className={cn("w-[260px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (dateRange.to ? (<>{format(dateRange.from, "dd/MM/yyyy")} - {format(dateRange.to, "dd/MM/yyyy")}</>) : format(dateRange.from, "dd/MM/yyyy")) : (<span>Chọn ngày</span>)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
                <div className="p-2 border-t flex justify-around">
                  <Button variant="ghost" size="sm" onClick={() => setDatePreset('this_week')}>Tuần này</Button>
                  <Button variant="ghost" size="sm" onClick={() => setDatePreset('this_month')}>Tháng này</Button>
                  <Button variant="ghost" size="sm" onClick={() => setDatePreset('this_year')}>Năm nay</Button>
                </div>
              </PopoverContent>
            </Popover>
            <Button onClick={handleExportExcel} variant="outline" size="sm">
              <File className="mr-2 h-4 w-4" />
              Xuất Excel
            </Button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng doanh thu</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">
                Trong khoảng thời gian đã chọn
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng doanh số</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+{totalSalesCount}</div>
              <p className="text-xs text-muted-foreground">
                Số đơn hàng trong khoảng thời gian đã chọn
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng nợ phải thu</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{formatCurrency(totalDebt)}</div>
              <p className="text-xs text-muted-foreground">
                Tổng công nợ của tất cả khách hàng
              </p>
            </CardContent>
          </Card>
          <DialogTrigger asChild>
            <Card className="cursor-pointer hover:bg-muted/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sản phẩm trong kho</CardTitle>
                <Boxes className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{products?.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Tổng số loại sản phẩm đang quản lý
                </p>
              </CardContent>
            </Card>
          </DialogTrigger>
        </div>
        <div className="grid gap-4 md:gap-8 lg:grid-cols-2">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Biểu đồ Doanh thu</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <RevenueChart data={monthlyData} />
            </CardContent>
          </Card>
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Sản phẩm bán chạy</CardTitle>
              <CardDescription>
                Top sản phẩm theo doanh thu trong khoảng thời gian đã chọn.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sản phẩm</TableHead>
                    <TableHead className="text-right">Số lượng bán</TableHead>
                    <TableHead className="text-right">Doanh thu</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && <TableRow><TableCell colSpan={3} className="h-24 text-center">Đang tải...</TableCell></TableRow>}
                  {!isLoading && soldProductsData.length === 0 && <TableRow><TableCell colSpan={3} className="h-24 text-center">Không có dữ liệu.</TableCell></TableRow>}
                  {!isLoading && soldProductsData.slice(0, 5).map((p) => (
                    <TableRow key={p.productId}>
                      <TableCell>
                        <div className="font-medium">{p.productName}</div>
                      </TableCell>
                      <TableCell className="text-right">{p.totalQuantity.toLocaleString()} {p.baseUnitName}</TableCell>
                      <TableCell className="text-right">{formatCurrency(p.totalRevenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Tồn kho Hiện tại</CardTitle>
            <CardDescription>
              Danh sách các sản phẩm và số lượng tồn kho hiện tại.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sản phẩm</TableHead>
                    <TableHead className="text-right">Tồn kho</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && <TableRow><TableCell colSpan={2} className="h-24 text-center">Đang tải...</TableCell></TableRow>}
                  {!isLoading && inventoryData.length === 0 && <TableRow><TableCell colSpan={2} className="h-24 text-center">Không có sản phẩm nào.</TableCell></TableRow>}
                  {!isLoading && inventoryData.map(({ product, stockDisplay }) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <Link href={`/products?q=${product.name}`} className="font-medium hover:underline">
                          {product.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right">{stockDisplay}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </Dialog>
  )
}
