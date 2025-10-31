'use client'

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { Search, ArrowUp, ArrowDown, File, Calendar as CalendarIcon, ChevronRight, ChevronDown } from "lucide-react"
import * as xlsx from 'xlsx';
import { DateRange } from "react-day-picker"
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns"
import * as React from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
  TableFooter as ShadcnTableFooter
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, query, getDocs } from "firebase/firestore"
import { Category, Product, Sale, SalesItem, Unit } from "@/lib/types"
import { formatCurrency, cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"

type SoldProductInfo = {
  productId: string;
  productName: string;
  categoryName: string;
  totalQuantity: number;
  totalRevenue: number;
  avgPrice: number;
  baseUnitName: string;
  saleUnitName?: string;
  conversionFactor?: number;
};

type SortKey = 'productName' | 'categoryName' | 'totalQuantity' | 'avgPrice' | 'totalRevenue';

export default function SoldProductsReportPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>('totalRevenue');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const firestore = useFirestore();

  const productsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, "products")) : null, [firestore]);
  const categoriesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, "categories")) : null, [firestore]);
  const unitsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, "units")) : null, [firestore]);
  const salesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, "sales_transactions")) : null, [firestore]);
  const customersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, "customers")) : null, [firestore]);

  const { data: products, isLoading: productsLoading } = useCollection<Product>(productsQuery);
  const { data: categories, isLoading: categoriesLoading } = useCollection<Category>(categoriesQuery);
  const { data: units, isLoading: unitsLoading } = useCollection<Unit>(unitsQuery);
  const { data: sales, isLoading: salesLoading } = useCollection<Sale>(salesQuery);
  const { data: customers, isLoading: customersLoading } = useCollection<any>(customersQuery);


  const [allSalesItems, setAllSalesItems] = useState<SalesItem[]>([]);
  const [salesItemsLoading, setSalesItemsLoading] = useState(true);

  const productsMap = useMemo(() => new Map(products?.map(p => [p.id, p])), [products]);
  const categoriesMap = useMemo(() => new Map(categories?.map(c => [c.id, c.name])), [categories]);
  const unitsMap = useMemo(() => new Map(units?.map(u => [u.id, u])), [units]);
  const salesMap = useMemo(() => new Map(sales?.map(s => [s.id, s])), [sales]);
  const customersMap = useMemo(() => new Map(customers?.map((c: any) => [c.id, c.name])), [customers]);

  useEffect(() => {
    async function fetchAllSalesItems() {
      if (!firestore || !sales) {
        if (!salesLoading) setSalesItemsLoading(false);
        return;
      }

      setSalesItemsLoading(true);
      const items: SalesItem[] = [];
      try {
        const salesToFetch = sales.filter(sale => {
          if (!dateRange?.from) return true;
          const saleDate = new Date(sale.transactionDate);
          const toDate = dateRange.to || dateRange.from;
          return saleDate >= dateRange.from && saleDate <= toDate;
        });

        for (const sale of salesToFetch) {
          const itemsCollectionRef = collection(firestore, `sales_transactions/${sale.id}/sales_items`);
          const itemsSnapshot = await getDocs(itemsCollectionRef);
          itemsSnapshot.forEach(doc => {
            items.push({ id: doc.id, salesTransactionId: sale.id, ...doc.data() } as SalesItem);
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
  }, [sales, firestore, salesLoading, dateRange]);


  const soldProductsData = useMemo((): SoldProductInfo[] => {
    if (!products || allSalesItems.length === 0) return [];

    const productSalesMap = new Map<string, { totalQuantity: number; totalRevenue: number; count: number }>();

    allSalesItems.forEach(item => {
      const existing = productSalesMap.get(item.productId) || { totalQuantity: 0, totalRevenue: 0, count: 0 };
      existing.totalQuantity += item.quantity;
      existing.totalRevenue += item.quantity * item.price;
      existing.count += 1;
      productSalesMap.set(item.productId, existing);
    });

    const results: SoldProductInfo[] = [];
    productSalesMap.forEach((data, productId) => {
      const product = productsMap.get(productId);
      if (product) {
        const saleUnit = unitsMap.get(product.unitId);
        const baseUnit = saleUnit?.baseUnitId ? unitsMap.get(saleUnit.baseUnitId) : saleUnit;
        
        results.push({
          productId,
          productName: product.name,
          categoryName: categoriesMap.get(product.categoryId) || 'N/A',
          totalQuantity: data.totalQuantity,
          totalRevenue: data.totalRevenue,
          avgPrice: data.totalRevenue / data.totalQuantity,
          baseUnitName: baseUnit?.name || '',
          saleUnitName: saleUnit?.name,
          conversionFactor: saleUnit?.conversionFactor,
        });
      }
    });

    return results;
  }, [products, allSalesItems, productsMap, categoriesMap, unitsMap]);

  const formatSoldQuantity = (item: SoldProductInfo) => {
    const { totalQuantity, baseUnitName, saleUnitName, conversionFactor } = item;
    if (saleUnitName && conversionFactor && conversionFactor > 1 && saleUnitName !== baseUnitName) {
      const quantityInSaleUnit = totalQuantity / conversionFactor;
      return `${totalQuantity.toLocaleString()} ${baseUnitName} (${quantityInSaleUnit.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${saleUnitName})`;
    }
    return `${totalQuantity.toLocaleString()} ${baseUnitName}`;
  };

  const filteredSoldProducts = useMemo(() => {
    return soldProductsData.filter(data => 
        data.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        data.categoryName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [soldProductsData, searchTerm]);

  const sortedSoldProducts = useMemo(() => {
    let sortableItems = [...filteredSoldProducts];
    if (sortKey) {
      sortableItems.sort((a, b) => {
        const valA = a[sortKey];
        const valB = b[sortKey];
        
        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredSoldProducts, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const toggleRow = (productId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const SortableHeader = ({ sortKey: key, children, className }: { sortKey: SortKey; children: React.ReactNode; className?: string }) => (
    <TableHead className={className}>
      <Button variant="ghost" onClick={() => handleSort(key)} className="px-2 py-1 h-auto">
        {children}
        {sortKey === key && (
          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 ml-2" /> : <ArrowDown className="h-4 w-4 ml-2" />
        )}
      </Button>
    </TableHead>
  );

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
    const dataToExport = sortedSoldProducts.map((data, index) => ({
      'STT': index + 1,
      'Tên sản phẩm': data.productName,
      'Loại': data.categoryName,
      'SL đã bán': formatSoldQuantity(data),
      'Đơn giá TB': data.avgPrice,
      'Thành tiền': data.totalRevenue,
    }));
    
    const totalRevenue = sortedSoldProducts.reduce((sum, item) => sum + item.totalRevenue, 0);
    const totalRowData = {
        'STT': '',
        'Tên sản phẩm': 'Tổng cộng',
        'Thành tiền': totalRevenue,
    };

    const worksheet = xlsx.utils.json_to_sheet([...dataToExport, totalRowData]);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "BaoCaoSanPhamBan");

    worksheet['!cols'] = [ {wch: 5}, {wch: 40}, {wch: 20}, {wch: 25}, {wch: 20}, {wch: 20} ];

    const numberFormat = '#,##0';
    dataToExport.forEach((_, index) => {
       const rowIndex = index + 2;
       ['E', 'F'].forEach(col => {
           const cell = worksheet[`${col}${rowIndex}`];
           if(cell) cell.z = numberFormat;
       });
   });

   const totalRowIndex = dataToExport.length + 2;
   worksheet[`F${totalRowIndex}`].z = numberFormat;
   worksheet[`F${totalRowIndex}`].s = { font: { bold: true } };
   worksheet[`B${totalRowIndex}`].s = { font: { bold: true } };

    xlsx.writeFile(workbook, "bao_cao_san_pham_da_ban.xlsx");
  };

  const isLoading = productsLoading || categoriesLoading || unitsLoading || salesLoading || salesItemsLoading || customersLoading;
  const totalRevenue = useMemo(() => sortedSoldProducts.reduce((acc, curr) => acc + curr.totalRevenue, 0), [sortedSoldProducts]);


  return (
    <Card>
      <CardHeader>
        <CardTitle>Báo cáo Sản phẩm đã bán</CardTitle>
        <CardDescription>
          Danh sách các sản phẩm đã bán trong khoảng thời gian đã chọn, được tổng hợp theo số lượng và doanh thu.
        </CardDescription>
        <div className="flex flex-wrap items-center gap-4 pt-4">
           <Popover>
              <PopoverTrigger asChild>
                <Button id="date" variant={"outline"} className={cn("w-[300px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (dateRange.to ? (<>{format(dateRange.from, "dd/MM/yyyy")} - {format(dateRange.to, "dd/MM/yyyy")}</>) : format(dateRange.from, "dd/MM/yyyy")) : (<span>Chọn ngày</span>)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                 <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
              </PopoverContent>
            </Popover>
             <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setDatePreset('this_week')}>Tuần này</Button>
                <Button variant="ghost" size="sm" onClick={() => setDatePreset('this_month')}>Tháng này</Button>
                <Button variant="ghost" size="sm" onClick={() => setDatePreset('this_year')}>Năm nay</Button>
            </div>
            <div className="relative ml-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Tìm sản phẩm, loại..."
                className="w-full rounded-lg bg-background pl-8 md:w-80"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button onClick={handleExportExcel} variant="outline">
              <File className="mr-2 h-4 w-4" />
              Xuất Excel
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <SortableHeader sortKey="productName">Tên sản phẩm</SortableHeader>
              <SortableHeader sortKey="categoryName">Loại</SortableHeader>
              <SortableHeader sortKey="totalQuantity" className="text-right">SL đã bán</SortableHeader>
              <SortableHeader sortKey="avgPrice" className="text-right">Đơn giá TB</SortableHeader>
              <SortableHeader sortKey="totalRevenue" className="text-right">Thành tiền</SortableHeader>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={6} className="text-center h-24">Đang tải dữ liệu...</TableCell></TableRow>}
            {!isLoading && sortedSoldProducts.map((data) => {
              const isExpanded = expandedRows.has(data.productId);
              const salesForProduct = allSalesItems.filter(item => item.productId === data.productId);
              
              return (
                <React.Fragment key={data.productId}>
                  <TableRow className="cursor-pointer" onClick={() => toggleRow(data.productId)}>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link href={`/products?q=${data.productName}`} className="hover:underline" onClick={e => e.stopPropagation()}>
                        {data.productName}
                      </Link>
                    </TableCell>
                    <TableCell>{data.categoryName}</TableCell>
                    <TableCell className="text-right font-medium">{formatSoldQuantity(data)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.avgPrice)}</TableCell>
                    <TableCell className="text-right font-semibold text-primary">{formatCurrency(data.totalRevenue)}</TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableCell colSpan={6}>
                        <div className="p-4">
                          <h4 className="font-semibold mb-2">Chi tiết các lần bán</h4>
                           <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Mã đơn hàng</TableHead>
                                <TableHead>Ngày bán</TableHead>
                                <TableHead>Khách hàng</TableHead>
                                <TableHead className="text-right">Số lượng</TableHead>
                                <TableHead className="text-right">Đơn giá</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {salesForProduct.map(item => {
                                const sale = salesMap.get(item.salesTransactionId);
                                return (
                                  <TableRow key={item.id}>
                                    <TableCell>
                                      <Link href={`/sales/${sale?.id}`} className="hover:underline">
                                        {sale?.invoiceNumber}
                                      </Link>
                                    </TableCell>
                                    <TableCell>{sale ? format(new Date(sale.transactionDate), 'dd/MM/yyyy') : ''}</TableCell>
                                    <TableCell>{sale ? customersMap.get(sale.customerId) : ''}</TableCell>
                                    <TableCell className="text-right">{item.quantity.toLocaleString()} {data.baseUnitName}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                                  </TableRow>
                                )
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              )
            })}
            {!isLoading && sortedSoldProducts.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24">Không có sản phẩm nào được bán trong khoảng thời gian đã chọn.</TableCell>
              </TableRow>
            )}
          </TableBody>
          <ShadcnTableFooter>
            <TableRow className="text-base font-bold">
              <TableCell colSpan={5}>Tổng cộng</TableCell>
              <TableCell className="text-right">{formatCurrency(totalRevenue)}</TableCell>
            </TableRow>
          </ShadcnTableFooter>
        </Table>
      </CardContent>
       <CardFooter>
            <div className="text-xs text-muted-foreground">
              Hiển thị <strong>{sortedSoldProducts.length}</strong> sản phẩm.
            </div>
          </CardFooter>
    </Card>
  );
}
