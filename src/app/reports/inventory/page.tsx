'use client'

import { useState, useMemo, useEffect, useCallback } from "react"
import { Search, ArrowUp, ArrowDown, File, Calendar as CalendarIcon, Wrench } from "lucide-react"
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
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, query, getDocs } from "firebase/firestore"
import { Product, Sale, SalesItem, Unit, PurchaseLot } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { InventoryAdjustmentForm } from "./components/adjustment-form";

type InventoryReportItem = {
  productId: string;
  productName: string;
  unitName: string;
  openingStock: number;
  importStock: number;
  exportStock: number;
  closingStock: number;
  mainUnit?: Unit;
  baseUnit?: Unit;
};

type SortKey = 'productName' | 'openingStock' | 'importStock' | 'exportStock' | 'closingStock';

export default function InventoryReportPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>('productName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [productToAdjust, setProductToAdjust] = useState<InventoryReportItem | null>(null);

  const firestore = useFirestore();

  const productsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, "products")) : null, [firestore]);
  const salesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, "sales_transactions")) : null, [firestore]);
  const unitsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, "units")) : null, [firestore]);

  const { data: products, isLoading: productsLoading } = useCollection<Product>(productsQuery);
  const { data: sales, isLoading: salesLoading } = useCollection<Sale>(salesQuery);
  const { data: units, isLoading: unitsLoading } = useCollection<Unit>(unitsQuery);

  const [allSalesItems, setAllSalesItems] = useState<SalesItem[]>([]);
  const [salesItemsLoading, setSalesItemsLoading] = useState(true);

  useEffect(() => {
    async function fetchAllSalesItems() {
      if (!firestore || !sales) return setSalesItemsLoading(false);
      setSalesItemsLoading(true);
      const items: SalesItem[] = [];
      try {
        for (const sale of sales) {
          const itemsCollectionRef = collection(firestore, `sales_transactions/${sale.id}/sales_items`);
          const itemsSnapshot = await getDocs(itemsCollectionRef);
          itemsSnapshot.forEach(doc => {
            items.push({ ...doc.data(), salesTransactionId: sale.id } as SalesItem);
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
  }, [sales, firestore]);

  const unitsMap = useMemo(() => new Map(units?.map(u => [u.id, u])), [units]);
  const salesMap = useMemo(() => new Map(sales?.map(s => [s.id, s])), [sales]);
  
  const getUnitInfo = useCallback((unitId: string) => {
    const unit = unitsMap.get(unitId);
    if (!unit) return { baseUnit: undefined, conversionFactor: 1, name: '' };
    if (unit.baseUnitId && unit.conversionFactor) {
      const baseUnit = unitsMap.get(unit.baseUnitId);
      return { baseUnit, conversionFactor: unit.conversionFactor, name: unit.name };
    }
    return { baseUnit: unit, conversionFactor: 1, name: unit.name };
  }, [unitsMap]);

  const inventoryReportData = useMemo((): InventoryReportItem[] => {
    if (!products) return [];

    return products.map(product => {
      const unitInfo = getUnitInfo(product.unitId);
      const baseUnit = unitInfo.baseUnit;

      const fromDate = dateRange?.from;
      const toDate = dateRange?.to;

      // Calculate Opening Stock
      const openingImports = (product.purchaseLots || []).filter(lot => fromDate && new Date(lot.importDate) < fromDate)
        .reduce((sum, lot) => sum + (lot.quantity * getUnitInfo(lot.unitId).conversionFactor), 0);
      const openingExports = allSalesItems.filter(item => {
        const sale = salesMap.get(item.salesTransactionId);
        return item.productId === product.id && sale && fromDate && new Date(sale.transactionDate) < fromDate;
      }).reduce((sum, item) => sum + item.quantity, 0);
      const openingStock = openingImports - openingExports;

      // Calculate movements within the period
      const importStock = (product.purchaseLots || []).filter(lot => {
        const importDate = new Date(lot.importDate);
        if(!fromDate || !toDate) return true;
        return importDate >= fromDate && importDate <= toDate;
      }).reduce((sum, lot) => sum + (lot.quantity * getUnitInfo(lot.unitId).conversionFactor), 0);

      const exportStock = allSalesItems.filter(item => {
        const sale = salesMap.get(item.salesTransactionId);
        if (!sale) return false;
        const saleDate = new Date(sale.transactionDate);
        if(!fromDate || !toDate) return item.productId === product.id;
        return item.productId === product.id && saleDate >= fromDate && saleDate <= toDate;
      }).reduce((sum, item) => sum + item.quantity, 0);

      const closingStock = openingStock + importStock - exportStock;

      return {
        productId: product.id,
        productName: product.name,
        unitName: baseUnit?.name || unitInfo.name,
        openingStock,
        importStock,
        exportStock,
        closingStock,
        mainUnit: unitsMap.get(product.unitId),
        baseUnit: baseUnit
      };
    });
  }, [products, allSalesItems, salesMap, dateRange, getUnitInfo, unitsMap]);


  const filteredReportData = useMemo(() => {
    return inventoryReportData.filter(data => 
        data.productName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [inventoryReportData, searchTerm]);

  const sortedReportData = useMemo(() => {
    let sortableItems = [...filteredReportData];
    sortableItems.sort((a, b) => {
        const valA = a[sortKey];
        const valB = b[sortKey];
        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      });
    return sortableItems;
  }, [filteredReportData, sortKey, sortDirection]);

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
      case 'this_week':
        setDateRange({ from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) });
        break;
      case 'this_month':
        setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
        break;
      case 'this_quarter':
        setDateRange({ from: startOfQuarter(now), to: endOfQuarter(now) });
        break;
      case 'this_year':
        setDateRange({ from: startOfYear(now), to: endOfYear(now) });
        break;
    }
  }

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

  const formatStockWithMainUnit = (quantityInBase: number, mainUnit?: Unit, baseUnit?: Unit) => {
    if (quantityInBase === 0) return "0";
    if (!mainUnit || !baseUnit) return quantityInBase.toLocaleString();

    const formattedBase = `${quantityInBase.toLocaleString(undefined, {maximumFractionDigits: 2})}`;

    if (mainUnit.id !== baseUnit.id && mainUnit.conversionFactor) {
      const quantityInMain = quantityInBase / mainUnit.conversionFactor;
      return `${formattedBase} ${baseUnit.name} (${quantityInMain.toLocaleString(undefined, {maximumFractionDigits: 2})} ${mainUnit.name})`;
    }
    
    return `${formattedBase} ${baseUnit.name}`;
  }


  const handleExportExcel = () => {
    const dataToExport = sortedReportData.map((data, index) => ({
      'STT': index + 1,
      'Sản phẩm': data.productName,
      'ĐVT': data.unitName,
      'Tồn đầu kỳ': data.openingStock,
      'Nhập trong kỳ': data.importStock,
      'Xuất trong kỳ': data.exportStock,
      'Tồn cuối kỳ': data.closingStock,
    }));

    const worksheet = xlsx.utils.json_to_sheet(dataToExport);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "BaoCaoTonKho");

    worksheet['!cols'] = [ {wch: 5}, {wch: 40}, {wch: 10}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 15} ];
    const numberFormat = '#,##0';
    dataToExport.forEach((_, index) => {
       const rowIndex = index + 2;
       ['D', 'E', 'F', 'G'].forEach(col => {
           const cell = worksheet[`${col}${rowIndex}`];
           if(cell) cell.z = numberFormat;
       });
   });

    xlsx.writeFile(workbook, "bao_cao_ton_kho.xlsx");
  };
  
  const handleOpenAdjustment = (item: InventoryReportItem) => {
    setProductToAdjust(item);
  };


  const isLoading = productsLoading || salesLoading || unitsLoading || salesItemsLoading;

  return (
    <>
      {productToAdjust && (
        <InventoryAdjustmentForm
          isOpen={!!productToAdjust}
          onOpenChange={() => setProductToAdjust(null)}
          productInfo={productToAdjust}
        />
      )}
      <Card>
        <CardHeader>
          <CardTitle>Báo cáo Nhập - Xuất - Tồn</CardTitle>
          <CardDescription>
            Xem lại lịch sử nhập, xuất và tồn kho của sản phẩm trong một khoảng thời gian.
          </CardDescription>
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
                <TableHead>ĐVT</TableHead>
                <SortableHeader sortKey="openingStock" className="text-right">Tồn đầu kỳ</SortableHeader>
                <SortableHeader sortKey="importStock" className="text-right">Nhập trong kỳ</SortableHeader>
                <SortableHeader sortKey="exportStock" className="text-right">Xuất trong kỳ</SortableHeader>
                <SortableHeader sortKey="closingStock" className="text-right">Tồn cuối kỳ</SortableHeader>
                <TableHead className="text-center">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={8} className="text-center h-24">Đang tải dữ liệu...</TableCell></TableRow>}
              {!isLoading && sortedReportData.map((data, index) => (
                <TableRow key={data.productId}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium">{data.productName}</TableCell>
                  <TableCell>{data.unitName}</TableCell>
                  <TableCell className="text-right">{formatStockWithMainUnit(data.openingStock, data.mainUnit, data.baseUnit)}</TableCell>
                  <TableCell className="text-right text-green-600">
                    {data.importStock > 0 ? `+${formatStockWithMainUnit(data.importStock, data.mainUnit, data.baseUnit)}` : 0}
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    {data.exportStock > 0 ? `-${formatStockWithMainUnit(data.exportStock, data.mainUnit, data.baseUnit)}` : 0}
                  </TableCell>
                  <TableCell className="text-right font-semibold">{formatStockWithMainUnit(data.closingStock, data.mainUnit, data.baseUnit)}</TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenAdjustment(data)}>
                      <Wrench className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && sortedReportData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center h-24">Không có dữ liệu tồn kho.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
         <CardFooter>
              <div className="text-xs text-muted-foreground">
                Hiển thị <strong>{sortedReportData.length}</strong> sản phẩm.
              </div>
            </CardFooter>
      </Card>
    </>
  );
}
