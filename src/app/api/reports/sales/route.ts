import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, getStoreIdFromRequest, verifyStoreAccess } from '@/lib/auth';
import { query } from '@/lib/db';

interface SalesReportRecord {
  TransactionDate: Date;
  TotalSales: number;
  TotalRevenue: number;
  TotalVat: number;
  TotalDiscount: number;
  NetRevenue: number;
}

interface SaleDetailRecord {
  Id: string;
  InvoiceNumber: string;
  CustomerName: string | null;
  TransactionDate: Date;
  TotalAmount: number;
  VatAmount: number;
  Discount: number;
  FinalAmount: number;
  Status: string;
}

/**
 * GET /api/reports/sales - Get sales report with aggregation
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);

    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    const storeId = getStoreIdFromRequest(request);
    if (!storeId) {
      return NextResponse.json(
        { error: 'Store ID is required' },
        { status: 400 }
      );
    }

    const hasAccess = await verifyStoreAccess(authResult.user.userId, storeId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Bạn không có quyền truy cập cửa hàng này' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');
    const groupBy = url.searchParams.get('groupBy') || 'day'; // day, week, month
    const includeDetails = url.searchParams.get('includeDetails') === 'true';

    // Build date filter
    const conditions: string[] = ['s.StoreId = @storeId'];
    const params: Record<string, unknown> = { storeId };

    if (dateFrom) {
      conditions.push('s.TransactionDate >= @dateFrom');
      params.dateFrom = new Date(dateFrom);
    }

    if (dateTo) {
      conditions.push('s.TransactionDate <= @dateTo');
      params.dateTo = new Date(dateTo);
    }

    const whereClause = conditions.join(' AND ');

    // Get aggregated summary
    let groupByClause: string;
    let selectDatePart: string;

    switch (groupBy) {
      case 'week':
        selectDatePart = `DATEADD(DAY, -DATEPART(WEEKDAY, s.TransactionDate) + 1, CAST(s.TransactionDate AS DATE))`;
        groupByClause = selectDatePart;
        break;
      case 'month':
        selectDatePart = `DATEFROMPARTS(YEAR(s.TransactionDate), MONTH(s.TransactionDate), 1)`;
        groupByClause = `YEAR(s.TransactionDate), MONTH(s.TransactionDate)`;
        break;
      default: // day
        selectDatePart = `CAST(s.TransactionDate AS DATE)`;
        groupByClause = selectDatePart;
    }

    const summaryQuery = `
      SELECT 
        ${selectDatePart} as TransactionDate,
        COUNT(*) as TotalSales,
        SUM(s.TotalAmount) as TotalRevenue,
        SUM(s.VatAmount) as TotalVat,
        SUM(s.Discount + ISNULL(s.TierDiscountAmount, 0) + ISNULL(s.PointsDiscount, 0)) as TotalDiscount,
        SUM(s.FinalAmount) as NetRevenue
      FROM Sales s
      WHERE ${whereClause}
      GROUP BY ${groupByClause}
      ORDER BY ${selectDatePart} ASC
    `;

    const summaryResults = await query<SalesReportRecord>(summaryQuery, params);

    // Calculate totals
    const totals = summaryResults.reduce(
      (acc, row) => ({
        totalSales: acc.totalSales + row.TotalSales,
        totalRevenue: acc.totalRevenue + row.TotalRevenue,
        totalVat: acc.totalVat + row.TotalVat,
        totalDiscount: acc.totalDiscount + row.TotalDiscount,
        netRevenue: acc.netRevenue + row.NetRevenue,
      }),
      { totalSales: 0, totalRevenue: 0, totalVat: 0, totalDiscount: 0, netRevenue: 0 }
    );

    const response: Record<string, unknown> = {
      success: true,
      summary: summaryResults.map(r => ({
        date: r.TransactionDate instanceof Date ? r.TransactionDate.toISOString() : String(r.TransactionDate),
        totalSales: r.TotalSales,
        totalRevenue: r.TotalRevenue,
        totalVat: r.TotalVat,
        totalDiscount: r.TotalDiscount,
        netRevenue: r.NetRevenue,
      })),
      totals,
    };

    // Include detailed sales if requested
    if (includeDetails) {
      const detailsQuery = `
        SELECT 
          s.Id,
          s.InvoiceNumber,
          c.Name as CustomerName,
          s.TransactionDate,
          s.TotalAmount,
          s.VatAmount,
          s.Discount + ISNULL(s.TierDiscountAmount, 0) + ISNULL(s.PointsDiscount, 0) as Discount,
          s.FinalAmount,
          s.Status
        FROM Sales s
        LEFT JOIN Customers c ON s.CustomerId = c.Id
        WHERE ${whereClause}
        ORDER BY s.TransactionDate DESC
      `;

      const detailsResults = await query<SaleDetailRecord>(detailsQuery, params);

      response.details = detailsResults.map(r => ({
        id: r.Id,
        invoiceNumber: r.InvoiceNumber,
        customerName: r.CustomerName || 'Khách lẻ',
        transactionDate: r.TransactionDate instanceof Date ? r.TransactionDate.toISOString() : String(r.TransactionDate),
        totalAmount: r.TotalAmount,
        vatAmount: r.VatAmount,
        discount: r.Discount,
        finalAmount: r.FinalAmount,
        status: r.Status,
      }));
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Get sales report error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi lấy báo cáo doanh thu' },
      { status: 500 }
    );
  }
}
