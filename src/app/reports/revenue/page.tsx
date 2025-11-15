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
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, query } from "firebase/firestore"
import { Sale, Customer } from "@/lib/types"
import { formatCurrency, cn } from "@/lib/utils"
import { DateRange } from "react-day-picker"
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfQuarter, endOfQuarter } from "date-fns"
import { vi } from "date-fns/locale"
import { Calendar as CalendarIcon, File, Undo2 } from "lucide-react"
import * as xlsx from 'xlsx';
import { RevenueChart } from "./components/revenue-chart"
import Link from "next/link"

export type MonthlyRevenue = {
  month: string;
  revenue: number;
  salesCount: number;
}

export default function RevenueReportPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const firestore = useFirestore();

  const salesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "sales_transactions"));
  }, [firestore]);
  
  const customersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "customers"));
  }, [firestore]);

  const { data: sales, isLoading: salesLoading } = useCollection<Sale>(salesQuery);
  const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersQuery);

  const customersMap = useMemo(() => {
    if (!customers) return new Map();
    return new Map(customers.map(c => [c.id, c.name]));
  }, [customers]);

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

  const monthlyData = useMemo((): MonthlyRevenue[] => {
    if (!filteredSales) return [];

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
      .map(([month, data]) => ({
        month,
        revenue: data.revenue,
        salesCount: data.salesCount,
      }))
      .sort((a, b) => a.month.localeCompare(b.month)); // Sort by month
  }, [filteredSales]);

  const totalRevenue = useMemo(() => {
    return filteredSales.reduce((acc, curr) => acc + curr.finalAmount, 0);
  }, [filteredSales]);
    
  const totalSalesCount = filteredSales.length;

  const setDatePreset = (preset: 'this_week' | 'this_month' | 'this_quarter' | 'this_year') => {
    const now = new Date();
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
    const header = ["STT", "Mã đơn hàng", "Khách hàng", "Ngày", "Doanh thu"];
    const body = filteredSales.map((sale, index) => [
      index + 1,
      sale.invoiceNumber,
      customersMap.get(sale.customerId) || 'Khách lẻ',
      format(new Date(sale.transactionDate), "dd/MM/yyyy"),
      sale.finalAmount,
    ]);

    const totalRow = ["", "Tổng cộng", "", "", totalRevenue];

    const worksheet = xlsx.utils.aoa_to_sheet([header, ...body, totalRow]);
    
    worksheet['!cols'] = [
      { wch: 5 }, { wch: 20 }, { wch: 30 }, { wch: 15 }, { wch: 20 }
    ];

    const numberFormat = '#,##0';
    body.forEach((_, index) => {
      const rowIndex = index + 2;
      const cell = worksheet[`E${rowIndex}`];
      if (cell) cell.z = numberFormat;
    });
    
    const totalRowIndex = body.length + 2;
    worksheet[`E${totalRowIndex}`].z = numberFormat;
    worksheet[`B${totalRowIndex}`].s = { font: { bold: true } };
    worksheet[`E${totalRowIndex}`].s = { font: { bold: true } };
    

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "BaoCaoDoanhThuChiTiet");

    xlsx.writeFile(workbook, "bao_cao_doanh_thu_chi_tiet.xlsx");
  };

  const isLoading = salesLoading || customersLoading;

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Báo cáo Doanh thu Chi tiết</CardTitle>
          <CardDescription>
            Phân tích chi tiết doanh thu theo từng đơn hàng trong khoảng thời gian đã chọn.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <div className="flex flex-wrap items-center gap-4 mb-6">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className={cn(
                    "w-[300px] justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "dd/MM/yyyy")} -{" "}
                        {format(dateRange.to, "dd/MM/yyyy")}
                      </>
                    ) : (
                      format(dateRange.from, "dd/MM/yyyy")
                    )
                  ) : (
                    <span>Chọn ngày</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
                 <div className="p-2 border-t flex justify-around">
                    <Button variant="ghost" size="sm" onClick={() => setDatePreset('this_week')}>Tuần này</Button>
                    <Button variant="ghost" size="sm" onClick={() => setDatePreset('this_month')}>Tháng này</Button>
                    <Button variant="ghost" size="sm" onClick={() => setDatePreset('this_quarter')}>Quý này</Button>
                    <Button variant="ghost" size="sm" onClick={() => setDatePreset('this_year')}>Năm nay</Button>
                 </div>
              </PopoverContent>
            </Popover>
            <Button onClick={handleExportExcel} variant="outline" className="ml-auto">
                <File className="mr-2 h-4 w-4" />
                Xuất Excel
            </Button>
           </div>
           
           <div className="mb-8">
             <h3 className="text-lg font-semibold mb-2">Biểu đồ doanh thu theo tháng</h3>
             <RevenueChart data={monthlyData} />
           </div>

           <h3 className="text-lg font-semibold mb-2">Chi tiết các đơn hàng</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">STT</TableHead>
                <TableHead>Mã đơn hàng</TableHead>
                <TableHead>Khách hàng</TableHead>
                <TableHead>Ngày bán</TableHead>
                <TableHead className="text-right">Doanh thu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TooltipProvider>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      Đang tải dữ liệu...
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && filteredSales.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      Không có dữ liệu trong khoảng thời gian này.
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && filteredSales.map((sale, index) => {
                  const isReturnOrder = sale.finalAmount < 0;
                  return (
                    <TableRow key={sale.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                           {isReturnOrder && (
                            <Tooltip>
                              <TooltipTrigger>
                                <Undo2 className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Đơn hàng trả</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          <Link href={`/sales/${sale.id}`} className="hover:underline">
                              {sale.invoiceNumber}
                          </Link>
                        </div>
                      </TableCell>
                      <TableCell>
                        {customersMap.get(sale.customerId) || 'Khách lẻ'}
                      </TableCell>
                      <TableCell>
                        {format(new Date(sale.transactionDate), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${isReturnOrder ? 'text-destructive' : 'text-primary'}`}>
                        {formatCurrency(sale.finalAmount)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TooltipProvider>
            </TableBody>
            <TableFooter>
                <TableRow className="text-base font-bold">
                    <TableCell colSpan={4}>Tổng cộng</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalRevenue)}</TableCell>
                </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
