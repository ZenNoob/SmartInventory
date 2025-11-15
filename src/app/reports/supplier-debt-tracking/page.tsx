
'use client'

import * as React from "react"
import { useState, useMemo } from "react"
import Link from "next/link"
import { Search, ArrowUp, ArrowDown, File, Calendar as CalendarIcon, ChevronDown, ChevronRight } from "lucide-react"
import * as xlsx from 'xlsx';
import { DateRange } from "react-day-picker"
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear, startOfQuarter, endOfQuarter } from "date-fns"

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
import { collection, query } from "firebase/firestore"
import { Supplier, PurchaseOrder, SupplierPayment } from "@/lib/types"
import { formatCurrency, cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"

export type SupplierDebtTrackingInfo = {
  supplierId: string;
  supplierName: string;
  supplierPhone?: string;
  openingBalance: number;
  incurredAmount: number;
  paidAmount: number;
  closingBalance: number;
  paymentsDuring: SupplierPayment[];
}

type SortKey = 'supplierName' | 'openingBalance' | 'incurredAmount' | 'paidAmount' | 'closingBalance';

export default function SupplierDebtTrackingPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>('closingBalance');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const firestore = useFirestore();

  const suppliersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, "suppliers")) : null, [firestore]);
  const purchasesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, "purchase_orders")) : null, [firestore]);
  const paymentsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, "supplier_payments")) : null, [firestore]);

  const { data: suppliers, isLoading: suppliersLoading } = useCollection<Supplier>(suppliersQuery);
  const { data: purchases, isLoading: purchasesLoading } = useCollection<PurchaseOrder>(purchasesQuery);
  const { data: payments, isLoading: paymentsLoading } = useCollection<SupplierPayment>(paymentsQuery);

  const debtTrackingData = useMemo((): SupplierDebtTrackingInfo[] => {
    if (!suppliers || !purchases || !payments || !dateRange?.from) return [];

    const fromDate = dateRange.from;
    const toDate = dateRange.to || fromDate;

    return suppliers.map(supplier => {
      // Opening Balance
      const purchasesBefore = purchases.filter(p => p.supplierId === supplier.id && new Date(p.importDate) < fromDate);
      const paymentsBefore = payments.filter(p => p.supplierId === supplier.id && new Date(p.paymentDate) < fromDate);
      const openingBalance = purchasesBefore.reduce((sum, p) => sum + p.totalAmount, 0) - paymentsBefore.reduce((sum, p) => sum + p.amount, 0);

      // Incurred and Paid during the period
      const purchasesDuring = purchases.filter(p => p.supplierId === supplier.id && new Date(p.importDate) >= fromDate && new Date(p.importDate) <= toDate);
      const paymentsDuring = payments.filter(p => p.supplierId === supplier.id && new Date(p.paymentDate) >= fromDate && new Date(p.paymentDate) <= toDate);
      const incurredAmount = purchasesDuring.reduce((sum, p) => sum + p.totalAmount, 0);
      const paidAmount = paymentsDuring.reduce((sum, p) => sum + p.amount, 0);

      const closingBalance = openingBalance + incurredAmount - paidAmount;

      return {
        supplierId: supplier.id,
        supplierName: supplier.name,
        supplierPhone: supplier.phone,
        openingBalance,
        incurredAmount,
        paidAmount,
        closingBalance,
        paymentsDuring: paymentsDuring.sort((a,b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()),
      };
    }).filter(data => 
        data.openingBalance !== 0 || 
        data.incurredAmount !== 0 || 
        data.paidAmount !== 0 || 
        data.closingBalance !== 0
    );
  }, [suppliers, purchases, payments, dateRange]);

  const filteredData = useMemo(() => {
    return debtTrackingData.filter(data => 
        data.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (data.supplierPhone && data.supplierPhone.includes(searchTerm))
    );
  }, [debtTrackingData, searchTerm]);

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

  const toggleRow = (supplierId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(supplierId)) {
        newSet.delete(supplierId);
      } else {
        newSet.add(supplierId);
      }
      return newSet;
    });
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

  const totalRow = useMemo(() => {
    return sortedData.reduce((acc, curr) => ({
      openingBalance: acc.openingBalance + curr.openingBalance,
      incurredAmount: acc.incurredAmount + curr.incurredAmount,
      paidAmount: acc.paidAmount + curr.paidAmount,
      closingBalance: acc.closingBalance + curr.closingBalance,
    }), { openingBalance: 0, incurredAmount: 0, paidAmount: 0, closingBalance: 0 });
  }, [sortedData]);

  const handleExportExcel = () => {
    const dataToExport = sortedData.map((data, index) => ({
      'STT': index + 1,
      'Nhà cung cấp': data.supplierName,
      'Nợ đầu kỳ': data.openingBalance,
      'Phát sinh': data.incurredAmount,
      'Thanh toán': data.paidAmount,
      'Nợ cuối kỳ': data.closingBalance,
    }));

    const worksheet = xlsx.utils.json_to_sheet([...dataToExport, {
        'Nhà cung cấp': 'Tổng cộng',
        'Nợ đầu kỳ': totalRow.openingBalance,
        'Phát sinh': totalRow.incurredAmount,
        'Thanh toán': totalRow.paidAmount,
        'Nợ cuối kỳ': totalRow.closingBalance,
    }]);

    worksheet['!cols'] = [ {wch: 5}, {wch: 30}, {wch: 20}, {wch: 20}, {wch: 20}, {wch: 20} ];
    const numberFormat = '#,##0';
    dataToExport.forEach((_, index) => {
       const rowIndex = index + 2;
       ['C', 'D', 'E', 'F'].forEach(col => {
           const cell = worksheet[`${col}${rowIndex}`];
           if(cell) cell.z = numberFormat;
       });
   });

   const totalRowIndex = dataToExport.length + 2;
    ['C', 'D', 'E', 'F'].forEach(col => {
      const cell = worksheet[`${col}${totalRowIndex}`];
      if(cell) {
        cell.z = numberFormat;
        cell.s = { font: { bold: true } };
      }
    });

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "DoiSoatCongNoNCC");
    xlsx.writeFile(workbook, "bao_cao_doi_soat_cong_no_ncc.xlsx");
  };

  const isLoading = suppliersLoading || purchasesLoading || paymentsLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Báo cáo Đối soát Công nợ Nhà cung cấp</CardTitle>
        <CardDescription>
          Phân tích chi tiết công nợ phải trả cho nhà cung cấp trong một khoảng thời gian.
        </CardDescription>
        <div className="flex flex-wrap items-center gap-4 pt-4">
           <Popover>
              <PopoverTrigger asChild>
                <Button id="date" variant={"outline"} className={cn("w-[300px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (dateRange.to ? (<>{format(dateRange.from, "dd/MM/yyyy")} - {format(dateRange.to, "dd/MM/yyyy")}</>) : format(dateRange.from, "dd/MM/yyyy")) : (<span>Chọn kỳ báo cáo</span>)}
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
                placeholder="Tìm nhà cung cấp..."
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
              <SortableHeader sortKey="supplierName">Nhà cung cấp</SortableHeader>
              <SortableHeader sortKey="openingBalance" className="text-right">Nợ đầu kỳ</SortableHeader>
              <SortableHeader sortKey="incurredAmount" className="text-right">Phát sinh</SortableHeader>
              <SortableHeader sortKey="paidAmount" className="text-right">Thanh toán</SortableHeader>
              <SortableHeader sortKey="closingBalance" className="text-right">Nợ cuối kỳ</SortableHeader>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={6} className="text-center h-24">Đang tải dữ liệu...</TableCell></TableRow>}
            {!isLoading && sortedData.map((data) => {
              const isExpanded = expandedRows.has(data.supplierId);
              return (
                <React.Fragment key={data.supplierId}>
                  <TableRow className="cursor-pointer" onClick={() => toggleRow(data.supplierId)}>
                    <TableCell>
                      {data.paymentsDuring.length > 0 && (
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{data.supplierName}</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.openingBalance)}</TableCell>
                    <TableCell className="text-right text-blue-600">{formatCurrency(data.incurredAmount)}</TableCell>
                    <TableCell className="text-right text-green-600">{formatCurrency(data.paidAmount)}</TableCell>
                    <TableCell className={`text-right font-semibold ${data.closingBalance > 0 ? 'text-destructive' : ''}`}>{formatCurrency(data.closingBalance)}</TableCell>
                  </TableRow>
                  {isExpanded && data.paymentsDuring.length > 0 && (
                     <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableCell colSpan={6}>
                          <div className="p-4">
                            <h4 className="font-semibold mb-2">Chi tiết thanh toán trong kỳ</h4>
                             <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Ngày thanh toán</TableHead>
                                  <TableHead>Ghi chú</TableHead>
                                  <TableHead className="text-right">Số tiền</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {data.paymentsDuring.map(payment => (
                                  <TableRow key={payment.id}>
                                    <TableCell>{format(new Date(payment.paymentDate), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell>{payment.notes}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(payment.amount)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </TableCell>
                      </TableRow>
                  )}
                </React.Fragment>
              )
            })}
            {!isLoading && sortedData.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24">Không có dữ liệu công nợ trong kỳ.</TableCell>
              </TableRow>
            )}
          </TableBody>
          <ShadcnTableFooter>
            <TableRow className="text-base font-bold">
              <TableCell colSpan={2}>Tổng cộng</TableCell>
              <TableCell className="text-right">{formatCurrency(totalRow.openingBalance)}</TableCell>
              <TableCell className="text-right">{formatCurrency(totalRow.incurredAmount)}</TableCell>
              <TableCell className="text-right">{formatCurrency(totalRow.paidAmount)}</TableCell>
              <TableCell className={`text-right ${totalRow.closingBalance > 0 ? 'text-destructive' : ''}`}>{formatCurrency(totalRow.closingBalance)}</TableCell>
            </TableRow>
          </ShadcnTableFooter>
        </Table>
      </CardContent>
       <CardFooter>
          <div className="text-xs text-muted-foreground">
            Hiển thị <strong>{sortedData.length}</strong> nhà cung cấp có giao dịch trong kỳ.
          </div>
        </CardFooter>
    </Card>
  );
}
