'use client'

import {
  DollarSign,
  Users,
  CreditCard,
  Package,
  Calendar as CalendarIcon,
  File,
  Boxes,
  Search
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
import { cn, formatCurrency } from "@/lib/utils"
import { apiClient } from "@/lib/api-client"
import { Customer, Sale, Payment, Product, SalesItem, Unit, Category } from "@/lib/types"
import { RevenueChart } from "../reports/revenue/components/revenue-chart"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Input } from "@/components/ui/input"
import { PaymentForm } from "../reports/debt/components/payment-form"
import { useUserRole } from "@/hooks/use-user-role"
import { useStore } from "@/contexts/store-context"

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

export type CustomerDebtInfo = {
  customerId: string;
  customerName: string;
  customerPhone?: string;
  totalSales: number;
  totalPayments: number;
  finalDebt: number;
};


export default function Dashboard() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [isInventoryDetailOpen, setIsInventoryDetailOpen] = useState(false);
  const [isDebtDetailOpen, setIsDebtDetailOpen] = useState(false);
  const [isSalesDetailOpen, setIsSalesDetailOpen] = useState(false);
  const [debtSearchTerm, setDebtSearchTerm] = useState("");
  const [salesSearchTerm, setSalesSearchTerm] = useState("");
  const [customerForPayment, setCustomerForPayment] = useState<CustomerDebtInfo | undefined>(undefined);
  const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);
  const { permissions, isLoading: isRoleLoading } = useUserRole();
  const { currentStore } = useStore();

  // State for data from SQL Server API
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allSalesItems, setAllSalesItems] = useState<SalesItem[]>([]);
  
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Fetch data from SQL Server API using apiClient - PARALLEL
  useEffect(() => {
    if (!currentStore) return;

    const fetchData = async () => {
      setIsDataLoading(true);
      
      try {
        // Fetch all data in parallel for faster loading
        const [
          customersData,
          salesData,
          paymentsData,
          productsData,
          unitsData,
          categoriesData
        ] = await Promise.all([
          apiClient.getCustomers().catch(e => { console.error('Error fetching customers:', e); return []; }),
          apiClient.getSales().catch(e => { console.error('Error fetching sales:', e); return []; }),
          apiClient.getPayments().catch(e => { console.error('Error fetching payments:', e); return []; }),
          apiClient.getProducts().catch(e => { console.error('Error fetching products:', e); return []; }),
          apiClient.getUnits().catch(e => { console.error('Error fetching units:', e); return []; }),
          apiClient.getCategories().catch(e => { console.error('Error fetching categories:', e); return []; }),
        ]);

        setCustomers(customersData as Customer[]);
        setSales(salesData as Sale[]);
        setPayments(paymentsData as Payment[]);
        setProducts(productsData as Product[]);
        setUnits(unitsData as Unit[]);
        setCategories(categoriesData as Category[]);
        setAllSalesItems([]); // Sales items not needed for now
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsDataLoading(false);
      }
    };

    fetchData();
  }, [currentStore]);
  
  const productsMap = useMemo(() => new Map(products?.map(p => [p.id, p])), [products]);
  const unitsMap = useMemo(() => new Map(units?.map(u => [u.id, u])), [units]);
  const categoriesMap = useMemo(() => new Map(categories?.map(c => [c.id, c.name])), [categories]);
  const customersMap = useMemo(() => new Map(customers?.map(c => [c.id, c.name])), [customers]);

  const filteredSales = useMemo(() => {
    if (!sales) return [];
    if (!dateRange || !dateRange.from) return sales;

    const fromDate = dateRange.from;
    const toDate = dateRange.to || fromDate;

    return sales.filter(sale => {
      const saleDate = new Date(sale.transactionDate);
      return saleDate >= fromDate && saleDate <= toDate;
    });
  }, [sales, dateRange]);

  const filteredSalesForDialog = useMemo(() => {
    if (!salesSearchTerm) return filteredSales;
    const term = salesSearchTerm.toLowerCase();
    return filteredSales.filter(sale => 
      sale.invoiceNumber.toLowerCase().includes(term) ||
      (customersMap.get(sale.customerId) || '').toLowerCase().includes(term)
    );
  }, [filteredSales, salesSearchTerm, customersMap]);
  
  const isLoading = isDataLoading || isRoleLoading;

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

    const { baseUnit: mainBaseUnit, conversionFactor: mainConversionFactor } = getUnitInfo(product.unitId);
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
    }).sort((a,b) => a.stock - b.stock);
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

  const totalRevenue = useMemo(() => filteredSales.reduce((acc, sale) => acc + sale.finalAmount, 0), [filteredSales]);
  const totalSalesCount = filteredSales.length;

  const allCustomerData = useMemo((): CustomerDebtInfo[] => {
    if (!customers || !sales || !payments) return [];
    return customers.map(customer => {
        const customerSales = sales.filter(s => s.customerId === customer.id).reduce((sum, s) => sum + (s.finalAmount || 0), 0);
        const customerPayments = payments.filter(p => p.customerId === customer.id).reduce((sum, p) => sum + p.amount, 0);
        const debt = customerSales - customerPayments;
        return { 
          customerId: customer.id, 
          customerName: customer.name, 
          customerPhone: customer.phone, 
          totalSales: customerSales,
          totalPayments: customerPayments,
          finalDebt: debt,
        };
    });
  }, [customers, sales, payments]);

  const customersWithDebt = useMemo(() => {
    return allCustomerData.filter(c => c.finalDebt > 0).sort((a,b) => b.finalDebt - a.finalDebt);
  }, [allCustomerData]);

  const topCustomers = useMemo(() => {
    return allCustomerData.sort((a,b) => b.totalSales - a.totalSales).slice(0, 5);
  }, [allCustomerData]);

  const totalDebt = useMemo(() => customersWithDebt.reduce((sum, c) => sum + c.finalDebt, 0), [customersWithDebt]);

  const filteredCustomersWithDebt = useMemo(() => {
    if (!debtSearchTerm) return customersWithDebt;
    const term = debtSearchTerm.toLowerCase();
    return customersWithDebt.filter(c => 
      c.customerName.toLowerCase().includes(term) || 
      (c.customerPhone && c.customerPhone.includes(term))
    );
  }, [customersWithDebt, debtSearchTerm]);
  
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
        if (!sale || !dateRange?.from) {
          return !dateRange;
        }
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

  const setDatePreset = (preset: 'this_week' | 'this_month' | 'this_year' | 'all') => {
    const now = new Date();
    if (preset === 'all') {
      setDateRange(undefined);
      return;
    }
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

  const handleOpenPaymentForm = (customer: CustomerDebtInfo) => {
    setCustomerForPayment(customer);
    setIsPaymentFormOpen(true);
  };

  const handleExportExcel = () => {
    const wb = xlsx.utils.book_new();

    const revenueData = monthlyData.map(d => ({ 'Tháng': d.month, 'Số đơn': d.salesCount, 'Doanh thu': d.revenue }));
    const revenueTotal = { 'Tháng': 'Tổng', 'Số đơn': totalSalesCount, 'Doanh thu': totalRevenue };
    const ws1 = xlsx.utils.json_to_sheet([...revenueData, revenueTotal]);
    xlsx.utils.book_append_sheet(wb, ws1, "DoanhThu");

    const productsData = soldProductsData.map(p => ({ 'Sản phẩm': p.productName, 'Số lượng bán': `${p.totalQuantity.toLocaleString()} ${p.baseUnitName}`, 'Doanh thu': p.totalRevenue }));
    const ws2 = xlsx.utils.json_to_sheet(productsData);
    xlsx.utils.book_append_sheet(wb, ws2, "SPBanChay");

    xlsx.writeFile(wb, `Report_${dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : 'all'}_${dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : ''}.xlsx`);
  }

  if (isLoading) {
    return <p>Đang tải bảng điều khiển...</p>;
  }

  if (!permissions?.dashboard?.includes('view')) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Truy cập bị từ chối</CardTitle>
          <CardDescription>
            Bạn không có quyền xem bảng điều khiển.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }


  return (
    <>
    {customerForPayment && (
        <PaymentForm
          isOpen={isPaymentFormOpen}
          onOpenChange={setIsPaymentFormOpen}
          customer={customerForPayment}
        />
      )}
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-2xl font-semibold">Phân tích kinh doanh</h1>
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          <Popover>
            <PopoverTrigger asChild>
              <Button id="date" variant={"outline"} className={cn("w-[260px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (dateRange.to ? (<>{format(dateRange.from, "dd/MM/yyyy")} - {format(dateRange.to, "dd/MM/yyyy")}</>) : format(dateRange.from, "dd/MM/yyyy")) : (<span>Tất cả thời gian</span>)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
              <div className="p-2 border-t flex justify-around">
                <Button variant="ghost" size="sm" onClick={() => setDatePreset('this_week')}>Tuần này</Button>
                <Button variant="ghost" size="sm" onClick={() => setDatePreset('this_month')}>Tháng này</Button>
                <Button variant="ghost" size="sm" onClick={() => setDatePreset('this_year')}>Năm nay</Button>
                <Button variant="ghost" size="sm" onClick={() => setDatePreset('all')}>Tất cả</Button>
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
        {permissions?.reports_revenue?.includes('view') && (
            <Dialog open={isSalesDetailOpen} onOpenChange={setIsSalesDetailOpen}>
            <DialogTrigger asChild>
                <Card className="cursor-pointer hover:bg-muted/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tổng doanh thu</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</div>
                    <p className="text-xs text-muted-foreground">
                    Trong khoảng thời gian đã chọn
                    </p>
                </CardContent>
                </Card>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                <DialogTitle>Chi tiết Doanh thu & Doanh số</DialogTitle>
                <DialogDescription>
                    Danh sách các đơn hàng trong khoảng thời gian đã chọn.
                </DialogDescription>
                </DialogHeader>
                <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Tìm theo mã đơn hoặc tên khách hàng..."
                    className="w-full rounded-lg bg-background pl-8"
                    value={salesSearchTerm}
                    onChange={(e) => setSalesSearchTerm(e.target.value)}
                />
                </div>
                <ScrollArea className="max-h-[60vh] pr-4">
                {isLoading ? (
                    <p>Đang tải dữ liệu...</p>
                ) : (
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Mã đơn hàng</TableHead>
                        <TableHead>Khách hàng</TableHead>
                        <TableHead>Ngày</TableHead>
                        <TableHead className="text-right">Số tiền</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredSalesForDialog.map(sale => (
                        <TableRow key={sale.id}>
                            <TableCell>
                            <Link href={`/sales/${sale.id}`} className="font-medium hover:underline">
                                {sale.invoiceNumber}
                            </Link>
                            </TableCell>
                            <TableCell>{customersMap.get(sale.customerId) || 'N/A'}</TableCell>
                            <TableCell>{format(new Date(sale.transactionDate), 'dd/MM/yyyy')}</TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency(sale.finalAmount)}</TableCell>
                        </TableRow>
                        ))}
                        {filteredSalesForDialog.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center h-24">Không có đơn hàng nào.</TableCell>
                        </TableRow>
                        )}
                    </TableBody>
                    </Table>
                )}
                </ScrollArea>
            </DialogContent>
            </Dialog>
        )}
        {permissions?.reports_revenue?.includes('view') && (
            <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setIsSalesDetailOpen(true)}>
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
        )}
        {permissions?.reports_debt?.includes('view') && (
            <Dialog open={isDebtDetailOpen} onOpenChange={setIsDebtDetailOpen}>
                <DialogTrigger asChild>
                    <Card className="cursor-pointer hover:bg-muted/50">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Tổng nợ phải thu</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-destructive">{formatCurrency(totalDebt)}</div>
                            <p className="text-xs text-muted-foreground">
                            Trên tổng số {customersWithDebt.length} khách hàng
                            </p>
                        </CardContent>
                    </Card>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                    <DialogTitle>Chi tiết nợ phải thu</DialogTitle>
                    <DialogDescription>
                        Danh sách các khách hàng đang có công nợ. Nhấp vào một khách hàng để thanh toán.
                    </DialogDescription>
                    </DialogHeader>
                    <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Tìm theo tên hoặc SĐT..."
                        className="w-full rounded-lg bg-background pl-8"
                        value={debtSearchTerm}
                        onChange={(e) => setDebtSearchTerm(e.target.value)}
                    />
                    </div>
                    <ScrollArea className="max-h-[60vh] pr-4">
                    {isLoading ? (
                        <p>Đang tải dữ liệu công nợ...</p>
                    ) : (
                        <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>Khách hàng</TableHead>
                            <TableHead>SĐT</TableHead>
                            <TableHead className="text-right">Số nợ</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredCustomersWithDebt.map(customer => (
                            <TableRow key={customer.customerId} className="cursor-pointer hover:bg-muted/50" onClick={() => handleOpenPaymentForm(customer)}>
                                <TableCell>
                                <Link href={`/customers/${customer.customerId}`} className="font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
                                    {customer.customerName}
                                </Link>
                                </TableCell>
                                <TableCell>{customer.customerPhone || 'N/A'}</TableCell>
                                <TableCell className="text-right font-semibold text-destructive">{formatCurrency(customer.finalDebt)}</TableCell>
                            </TableRow>
                            ))}
                            {filteredCustomersWithDebt.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center h-24">Không có khách hàng nào đang nợ.</TableCell>
                            </TableRow>
                            )}
                        </TableBody>
                        </Table>
                    )}
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        )}
        {permissions?.reports_inventory?.includes('view') && (
            <Dialog open={isInventoryDetailOpen} onOpenChange={setIsInventoryDetailOpen}>
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
            </Dialog>
        )}
      </div>
      <div className="grid gap-4 md:gap-8 lg:grid-cols-2">
        {permissions?.reports_revenue?.includes('view') && (
            <Card className="lg:col-span-1">
            <CardHeader>
                <CardTitle>Biểu đồ Doanh thu</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
                <RevenueChart data={monthlyData} />
            </CardContent>
            </Card>
        )}
        {permissions?.customers?.includes('view') && (
            <Card className="lg:col-span-1">
            <CardHeader>
                <CardTitle>Khách hàng hàng đầu</CardTitle>
                <CardDescription>
                Top 5 khách hàng mua nhiều nhất.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead className="w-12">STT</TableHead>
                    <TableHead>Khách hàng</TableHead>
                    <TableHead className="text-right">Đã mua</TableHead>
                    <TableHead className="text-right">Tiền nợ</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading && <TableRow><TableCell colSpan={4} className="h-24 text-center">Đang tải...</TableCell></TableRow>}
                    {!isLoading && topCustomers.length === 0 && <TableRow><TableCell colSpan={4} className="h-24 text-center">Không có dữ liệu.</TableCell></TableRow>}
                    {!isLoading && topCustomers.map((customer, index) => (
                    <TableRow key={customer.customerId}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>
                        <Link href={`/customers/${customer.customerId}`} className="font-medium hover:underline">
                            {customer.customerName}
                        </Link>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(customer.totalSales)}</TableCell>
                        <TableCell className="text-right">
                        <Button 
                            variant="link" 
                            className={`h-auto p-0 ${customer.finalDebt > 0 ? 'text-destructive' : ''}`}
                            onClick={() => customer.finalDebt > 0 && handleOpenPaymentForm(customer)}
                            disabled={customer.finalDebt <= 0}
                        >
                            {formatCurrency(customer.finalDebt)}
                        </Button>
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </CardContent>
            </Card>
        )}
      </div>
       {permissions?.reports_sold_products?.includes('view') && (
        <Card>
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
       )}
    </div>
    </>
  )
}
