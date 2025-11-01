'use client'

import { useState, useMemo } from "react"
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
  TableFooter,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, query } from "firebase/firestore"
import { Sale, Product, PurchaseOrder, CashTransaction } from "@/lib/types"
import { formatCurrency, cn } from "@/lib/utils"
import { DateRange } from "react-day-picker"
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfQuarter, endOfQuarter } from "date-fns"
import { Calendar as CalendarIcon, File, TrendingDown, TrendingUp } from "lucide-react"
import * as xlsx from 'xlsx';

export default function IncomeStatementPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const firestore = useFirestore();

  const salesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, "sales_transactions")) : null, [firestore]);
  const purchasesQuery = useMemoFirebase(() => firestore ? query(collection(firestore, "purchase_orders")) : null, [firestore]);
  const cashTransactionsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, "cash_transactions")) : null, [firestore]);

  const { data: sales, isLoading: salesLoading } = useCollection<Sale>(salesQuery);
  const { data: purchases, isLoading: purchasesLoading } = useCollection<PurchaseOrder>(purchasesQuery);
  const { data: cashTransactions, isLoading: cashTransactionsLoading } = useCollection<CashTransaction>(cashTransactionsQuery);

  const filteredData = useMemo(() => {
    const fromDate = dateRange?.from;
    const toDate = dateRange?.to;

    const filterByDate = (dateString: string) => {
        if (!fromDate || !toDate) return true;
        const date = new Date(dateString);
        return date >= fromDate && date <= toDate;
    };
    
    const filteredSales = sales?.filter(s => filterByDate(s.transactionDate)) || [];
    const filteredPurchases = purchases?.filter(p => filterByDate(p.importDate)) || [];
    const filteredCashThu = cashTransactions?.filter(t => t.type === 'thu' && filterByDate(t.transactionDate)) || [];
    const filteredCashChi = cashTransactions?.filter(t => t.type === 'chi' && filterByDate(t.transactionDate)) || [];

    return { filteredSales, filteredPurchases, filteredCashThu, filteredCashChi };

  }, [sales, purchases, cashTransactions, dateRange]);


  const totalRevenue = useMemo(() => filteredData.filteredSales.reduce((sum, s) => sum + s.finalAmount, 0), [filteredData.filteredSales]);
  const totalPurchaseCost = useMemo(() => filteredData.filteredPurchases.reduce((sum, p) => sum + p.totalAmount, 0), [filteredData.filteredPurchases]);
  const totalOtherIncome = useMemo(() => filteredData.filteredCashThu.reduce((sum, t) => sum + t.amount, 0), [filteredData.filteredCashThu]);
  const totalOtherExpense = useMemo(() => filteredData.filteredCashChi.reduce((sum, t) => sum + t.amount, 0), [filteredData.filteredCashChi]);
  
  const grossProfit = totalRevenue - totalPurchaseCost;
  const netIncome = grossProfit + totalOtherIncome - totalOtherExpense;

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

  const handleExportExcel = () => {
    const data = [
      { Category: 'Doanh thu', Description: 'Tổng doanh thu bán hàng', Amount: totalRevenue },
      { Category: 'Chi phí', Description: 'Tổng chi phí nhập hàng', Amount: -totalPurchaseCost },
      { Category: 'Thu nhập khác', Description: 'Tổng thu từ sổ quỹ', Amount: totalOtherIncome },
      { Category: 'Chi phí khác', Description: 'Tổng chi từ sổ quỹ', Amount: -totalOtherExpense },
    ];

    const worksheet = xlsx.utils.json_to_sheet(data);
    const summary = [
        [],
        { A: 'Lợi nhuận gộp', B: grossProfit },
        { A: 'Lợi nhuận ròng', B: netIncome },
    ];
    xlsx.utils.sheet_add_json(worksheet, summary, { origin: -1, skipHeader: true });

    worksheet['!cols'] = [ {wch: 20}, {wch: 40}, {wch: 20} ];
    
    const numberFormat = '#,##0';
    data.forEach((_, index) => {
        worksheet[`C${index + 2}`].z = numberFormat;
    });
    worksheet[`B${data.length + 3}`].z = numberFormat;
    worksheet[`B${data.length + 4}`].z = numberFormat;
    
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "BaoCaoThuChi");

    xlsx.writeFile(workbook, "bao_cao_thu_chi.xlsx");
  };

  const isLoading = salesLoading || purchasesLoading || cashTransactionsLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Báo cáo Kết quả Kinh doanh (Thu-Chi)</CardTitle>
        <CardDescription>
          Tổng hợp doanh thu và chi phí để tính toán lợi nhuận trong khoảng thời gian đã chọn.
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
            <Button onClick={handleExportExcel} variant="outline" className="ml-auto">
              <File className="mr-2 h-4 w-4" />
              Xuất Excel
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
            <p>Đang tải dữ liệu...</p>
        ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Hạng mục</TableHead>
              <TableHead>Diễn giải</TableHead>
              <TableHead className="text-right">Số tiền</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-500" /> Doanh thu</TableCell>
              <TableCell>Tổng doanh thu từ bán hàng</TableCell>
              <TableCell className="text-right">{formatCurrency(totalRevenue)}</TableCell>
            </TableRow>
             <TableRow>
              <TableCell className="font-medium flex items-center gap-2"><TrendingDown className="h-4 w-4 text-red-500" /> Chi phí nhập hàng</TableCell>
              <TableCell>Tổng chi phí từ các đơn nhập hàng</TableCell>
              <TableCell className="text-right text-destructive">-{formatCurrency(totalPurchaseCost)}</TableCell>
            </TableRow>
             <TableRow className="bg-muted/50 font-semibold">
              <TableCell colSpan={2}>Lợi nhuận gộp</TableCell>
              <TableCell className="text-right">{formatCurrency(grossProfit)}</TableCell>
            </TableRow>
             <TableRow>
              <TableCell className="font-medium flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-500" /> Thu nhập khác</TableCell>
              <TableCell>Tổng thu từ các phiếu thu trong sổ quỹ</TableCell>
              <TableCell className="text-right">{formatCurrency(totalOtherIncome)}</TableCell>
            </TableRow>
             <TableRow>
              <TableCell className="font-medium flex items-center gap-2"><TrendingDown className="h-4 w-4 text-red-500" /> Chi phí khác</TableCell>
              <TableCell>Tổng chi từ các phiếu chi trong sổ quỹ</TableCell>
              <TableCell className="text-right text-destructive">-{formatCurrency(totalOtherExpense)}</TableCell>
            </TableRow>
          </TableBody>
          <TableFooter>
            <TableRow className="text-lg font-bold">
              <TableCell colSpan={2}>Lợi nhuận ròng (Sau Thu & Chi khác)</TableCell>
              <TableCell className={`text-right ${netIncome >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {formatCurrency(netIncome)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
        )}
      </CardContent>
    </Card>
  )
}
