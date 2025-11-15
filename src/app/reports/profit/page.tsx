'use client'

import { useState, useMemo, useEffect, useCallback } from "react"
import { Search, ArrowUp, ArrowDown, File, Calendar as CalendarIcon, DollarSign } from "lucide-react"
import * as xlsx from 'xlsx';
import { DateRange } from "react-day-picker"
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns"

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
import { Product, Sale, SalesItem, Unit } from "@/lib/types"
import { formatCurrency, cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"

type ProfitReportItem = {
  productId: string;
  productName: string;
  totalQuantity: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
};

type SortKey = 'productName' | 'totalQuantity' | 'totalRevenue' | 'totalCost' | 'totalProfit';

export default function ProfitReportPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>('totalProfit');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const firestore = useFirestore();

  const productsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, "products")) : null, [firestore]);
  const salesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, "sales_transactions")) : null, [firestore]);
  const unitsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, "units")) : null, [firestore]);

  const { data: products, isLoading: productsLoading } = useCollection<Product>(productsQuery);
  const { data: sales, isLoading: salesLoading } = useCollection<Sale>(salesQuery);
  const { data: units, isLoading: unitsLoading } = useCollection<Unit>(unitsQuery);

  const [allSalesItems, setAllSalesItems] = useState<SalesItem[]>([]);
  const [salesItemsLoading, setSalesItemsLoading] = useState(true);

  const productsMap = useMemo(() => new Map(products?.map(p => [p.id, p])), [products]);
  const unitsMap = useMemo(() => new Map(units?.map(u => [u.id, u])), [units]);

  useEffect(() => {
    async function fetchAllSalesItems() {
      if (!firestore || !sales) {
        if (!salesLoading) setSalesItemsLoading(false);
        return;
      }
      setSalesItemsLoading(true);
      const items: SalesItem[] = [];
      try {
        const salesInDateRange = sales.filter(sale => {
          if (!dateRange || !dateRange.from) return true;
          const saleDate = new Date(sale.transactionDate);
          const toDate = dateRange.to || dateRange.from;
          return saleDate >= dateRange.from && saleDate <= toDate;
        });

        for (const sale of salesInDateRange) {
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
  
  const getUnitInfo = useCallback((unitId: string) => {
    const unit = unitsMap.get(unitId);
    if (!unit) return { baseUnit: undefined, conversionFactor: 1 };
    if (unit.baseUnitId && unit.conversionFactor) {
      const baseUnit = unitsMap.get(unit.baseUnitId);
      return { baseUnit, conversionFactor: unit.conversionFactor };
    }
    return { baseUnit: unit, conversionFactor: 1 };
  }, [unitsMap]);

  const getAverageCost = useCallback((product: Product) => {
    if (!product.purchaseLots || product.purchaseLots.length === 0) return 0;
    let totalCost = 0;
    let totalQuantityInBaseUnit = 0;
    product.purchaseLots.forEach(lot => {
      const { conversionFactor } = getUnitInfo(lot.unitId);
      const quantityInBaseUnit = lot.quantity * conversionFactor;
      if (lot.cost > 0) { // Exclude adjustments from cost calculation
        totalCost += lot.cost * quantityInBaseUnit;
        totalQuantityInBaseUnit += quantityInBaseUnit;
      }
    });
    return totalQuantityInBaseUnit > 0 ? totalCost / totalQuantityInBaseUnit : 0;
  }, [getUnitInfo]);

  const profitReportData = useMemo((): ProfitReportItem[] => {
    if (allSalesItems.length === 0 || productsMap.size === 0) return [];
    
    const reportMap = new Map<string, ProfitReportItem>();

    allSalesItems.forEach(item => {
      const product = productsMap.get(item.productId);
      if (!product) return;

      const avgCost = getAverageCost(product);
      const itemCost = item.quantity * avgCost;
      const itemRevenue = item.quantity * item.price;
      const itemProfit = itemRevenue - itemCost;
      
      const existing = reportMap.get(item.productId) || {
        productId: item.productId,
        productName: product.name,
        totalQuantity: 0,
        totalRevenue: 0,
        totalCost: 0,
        totalProfit: 0,
      };

      existing.totalQuantity += item.quantity;
      existing.totalRevenue += itemRevenue;
      existing.totalCost += itemCost;
      existing.totalProfit += itemProfit;
      
      reportMap.set(item.productId, existing);
    });

    return Array.from(reportMap.values());
  }, [allSalesItems, productsMap, getAverageCost]);

  const filteredData = useMemo(() => {
    return profitReportData.filter(item => 
      item.productName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [profitReportData, searchTerm]);

  const sortedData = useMemo(() => {
    let sortableItems = [...filteredData];
    sortableItems.sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });
    return sortableItems;
  }, [filteredData, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const setDatePreset = (preset: 'this_week' | 'this_month' | 'this_quarter' | 'this_year' | 'all') => {
    const now = new Date();
    if (preset === 'all') {
      setDateRange(undefined);
      return;
    }
    switch (preset) {
      case 'this_week': setDateRange({ from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) }); break;
      case 'this_month': setDateRange({ from: startOfMonth(now), to: endOfMonth(now) }); break;
      case 'this_quarter': setDateRange({ from: startOfQuarter(now), to: endOfQuarter(now) }); break;
      case 'this_year': setDateRange({ from: startOfYear(now), to: endOfYear(now) }); break;
    }
  }

  const handleExportExcel = () => {
    const dataToExport = sortedData.map((data, index) => ({
      'STT': index + 1,
      'Sản phẩm': data.productName,
      'SL bán': data.totalQuantity,
      'Doanh thu': data.totalRevenue,
      'Giá vốn': data.totalCost,
      'Lợi nhuận': data.totalProfit,
    }));

    const worksheet = xlsx.utils.json_to_sheet(dataToExport);
    worksheet['!cols'] = [{ wch: 5 }, { wch: 40 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
    const numberFormat = '#,##0';
    dataToExport.forEach((_, index) => {
      const rowIndex = index + 2;
      ['C', 'D', 'E', 'F'].forEach(col => {
        const cell = worksheet[`${col}${rowIndex}`];
        if (cell) cell.z = numberFormat;
      });
    });

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "BaoCaoLoiNhuan");
    xlsx.writeFile(workbook, "bao_cao_loi_nhuan.xlsx");
  };

  const totalRow = useMemo(() => {
    return sortedData.reduce((acc, curr) => ({
      totalRevenue: acc.totalRevenue + curr.totalRevenue,
      totalCost: acc.totalCost + curr.totalCost,
      totalProfit: acc.totalProfit + curr.totalProfit,
    }), { totalRevenue: 0, totalCost: 0, totalProfit: 0 });
  }, [sortedData]);


  const SortableHeader = ({ sortKey: key, children, className }: { sortKey: SortKey; children: React.ReactNode; className?: string }) => (
    <TableHead className={className}>
      <Button variant="ghost" onClick={() => handleSort(key)} className="px-2 py-1 h-auto">
        {children}
        {sortKey === key && (sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 ml-2" /> : <ArrowDown className="h-4 w-4 ml-2" />)}
      </Button>
    </TableHead>
  );

  const isLoading = productsLoading || salesLoading || unitsLoading || salesItemsLoading;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>Báo cáo Lợi nhuận theo Sản phẩm</CardTitle>
                <CardDescription>
                Phân tích doanh thu, giá vốn và lợi nhuận của từng sản phẩm.
                </CardDescription>
            </div>
             <div className="text-right">
                  <p className="text-sm text-muted-foreground">Tổng lợi nhuận</p>
                  <p className={`text-2xl font-bold ${totalRow.totalProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      {formatCurrency(totalRow.totalProfit)}
                  </p>
              </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 pt-4">
           <Popover>
              <PopoverTrigger asChild>
                <Button id="date" variant={"outline"} className={cn("w-[300px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (dateRange.to ? (<>{format(dateRange.from, "dd/MM/yyyy")} - {format(dateRange.to, "dd/MM/yyyy")}</>) : format(dateRange.from, "dd/MM/yyyy")) : (<span>Tất cả thời gian</span>)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                 <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
                 <div className="p-2 border-t grid grid-cols-3 gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setDatePreset('this_week')}>Tuần này</Button>
                    <Button variant="ghost" size="sm" onClick={() => setDatePreset('this_month')}>Tháng này</Button>
                    <Button variant="ghost" size="sm" onClick={() => setDatePreset('this_quarter')}>Quý này</Button>
                    <Button variant="ghost" size="sm" onClick={() => setDatePreset('this_year')}>Năm nay</Button>
                    <Button variant="ghost" size="sm" onClick={() => setDatePreset('all')}>Tất cả</Button>
                </div>
              </PopoverContent>
            </Popover>
            <div className="relative ml-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Tìm sản phẩm..."
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
              <TableHead className="w-16">STT</TableHead>
              <SortableHeader sortKey="productName">Sản phẩm</SortableHeader>
              <SortableHeader sortKey="totalQuantity" className="text-right">SL bán</SortableHeader>
              <SortableHeader sortKey="totalRevenue" className="text-right">Doanh thu</SortableHeader>
              <SortableHeader sortKey="totalCost" className="text-right">Giá vốn</SortableHeader>
              <SortableHeader sortKey="totalProfit" className="text-right">Lợi nhuận</SortableHeader>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={6} className="text-center h-24">Đang tải và tính toán dữ liệu...</TableCell></TableRow>}
            {!isLoading && sortedData.map((item, index) => (
              <TableRow key={item.productId}>
                <TableCell>{index + 1}</TableCell>
                <TableCell className="font-medium">{item.productName}</TableCell>
                <TableCell className="text-right">{item.totalQuantity.toLocaleString()}</TableCell>
                <TableCell className="text-right text-blue-600">{formatCurrency(item.totalRevenue)}</TableCell>
                <TableCell className="text-right text-orange-600">{formatCurrency(item.totalCost)}</TableCell>
                <TableCell className={`text-right font-semibold ${item.totalProfit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                  {formatCurrency(item.totalProfit)}
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && sortedData.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center h-24">Không có dữ liệu.</TableCell></TableRow>
            )}
          </TableBody>
           <ShadcnTableFooter>
            <TableRow className="text-base font-bold">
              <TableCell colSpan={3}>Tổng cộng</TableCell>
              <TableCell className="text-right">{formatCurrency(totalRow.totalRevenue)}</TableCell>
              <TableCell className="text-right">{formatCurrency(totalRow.totalCost)}</TableCell>
              <TableCell className={`text-right ${totalRow.totalProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>{formatCurrency(totalRow.totalProfit)}</TableCell>
            </TableRow>
          </ShadcnTableFooter>
        </Table>
      </CardContent>
       <CardFooter>
            <div className="text-xs text-muted-foreground">
              Hiển thị <strong>{sortedData.length}</strong> sản phẩm.
            </div>
        </CardFooter>
    </Card>
  );
}
