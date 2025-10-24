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
import { Sale } from "@/lib/types"
import { formatCurrency, cn } from "@/lib/utils"
import { DateRange } from "react-day-picker"
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, getMonth, getYear } from "date-fns"
import { vi } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import { RevenueChart } from "./components/revenue-chart"

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

  const { data: sales, isLoading } = useCollection<Sale>(salesQuery);

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
    return monthlyData.reduce((acc, curr) => acc + curr.revenue, 0);
  }, [monthlyData]);

  const setDatePreset = (preset: 'this_week' | 'this_month' | 'this_year') => {
    const now = new Date();
    switch (preset) {
      case 'this_week':
        setDateRange({ from: startOfWeek(now), to: endOfWeek(now) });
        break;
      case 'this_month':
        setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
        break;
      case 'this_year':
        setDateRange({ from: startOfYear(now), to: endOfYear(now) });
        break;
    }
  }


  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Báo cáo Doanh thu</CardTitle>
          <CardDescription>
            Phân tích doanh thu theo khoảng thời gian đã chọn.
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
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
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
              </PopoverContent>
            </Popover>
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setDatePreset('this_week')}>Tuần này</Button>
                <Button variant="ghost" size="sm" onClick={() => setDatePreset('this_month')}>Tháng này</Button>
                <Button variant="ghost" size="sm" onClick={() => setDatePreset('this_year')}>Năm nay</Button>
            </div>
           </div>
           
           <div className="mb-8">
             <RevenueChart data={monthlyData} />
           </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">STT</TableHead>
                <TableHead>Tháng</TableHead>
                <TableHead className="text-right">Số đơn hàng</TableHead>
                <TableHead className="text-right">Doanh thu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    Đang tải dữ liệu...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && monthlyData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    Không có dữ liệu trong khoảng thời gian này.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && monthlyData.map((data, index) => (
                <TableRow key={data.month}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium">
                    {format(new Date(data.month), "MMMM yyyy", { locale: vi })}
                  </TableCell>
                  <TableCell className="text-right">{data.salesCount}</TableCell>
                  <TableCell className="text-right font-semibold text-primary">
                    {formatCurrency(data.revenue)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
                <TableRow className="text-base font-bold">
                    <TableCell colSpan={3}>Tổng cộng</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalRevenue)}</TableCell>
                </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
