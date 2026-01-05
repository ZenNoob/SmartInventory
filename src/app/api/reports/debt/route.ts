import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, getStoreIdFromRequest, verifyStoreAccess } from '@/lib/auth';
import { query } from '@/lib/db';

interface CustomerDebtRecord {
  CustomerId: string;
  CustomerName: string;
  CustomerPhone: string | null;
  CustomerEmail: string | null;
  CreditLimit: number;
  TotalSales: number;
  TotalPayments: number;
  CurrentDebt: number;
  LastTransactionDate: Date | null;
  LastPaymentDate: Date | null;
}

interface DebtHistoryRecord {
  Id: string;
  Type: string;
  Date: Date;
  Amount: number;
  InvoiceNumber: string | null;
  Notes: string | null;
  RunningBalance: number;
}

/**
 * GET /api/reports/debt - Get customer debt summary report
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
    const customerId = url.searchParams.get('customerId');
    const search = url.searchParams.get('search');
    const hasDebtOnly = url.searchParams.get('hasDebtOnly') === 'true';
    const overCreditOnly = url.searchParams.get('overCreditOnly') === 'true';

    const params: Record<string, unknown> = { storeId };

    // If specific customer requested, return detailed history
    if (customerId) {
      params.customerId = customerId;

      // Get customer info
      const customerQuery = `
        SELECT 
          c.Id as CustomerId,
          c.Name as CustomerName,
          c.Phone as CustomerPhone,
          c.Email as CustomerEmail,
          c.CreditLimit,
          c.CurrentDebt
        FROM Customers c
        WHERE c.Id = @customerId AND c.StoreId = @storeId
      `;

      const customerResults = await query<{
        CustomerId: string;
        CustomerName: string;
        CustomerPhone: string | null;
        CustomerEmail: string | null;
        CreditLimit: number;
        CurrentDebt: number;
      }>(customerQuery, params);

      if (customerResults.length === 0) {
        return NextResponse.json(
          { error: 'Không tìm thấy khách hàng' },
          { status: 404 }
        );
      }

      const customer = customerResults[0];

      // Get debt history (sales and payments)
      const historyQuery = `
        SELECT * FROM (
          SELECT 
            s.Id,
            'sale' as Type,
            s.TransactionDate as Date,
            s.FinalAmount as Amount,
            s.InvoiceNumber,
            NULL as Notes
          FROM Sales s
          WHERE s.CustomerId = @customerId AND s.StoreId = @storeId
          
          UNION ALL
          
          SELECT 
            p.Id,
            'payment' as Type,
            p.PaymentDate as Date,
            -p.Amount as Amount,
            NULL as InvoiceNumber,
            p.Notes
          FROM Payments p
          WHERE p.CustomerId = @customerId AND p.StoreId = @storeId
        ) AS History
        ORDER BY Date ASC
      `;

      const historyResults = await query<DebtHistoryRecord>(historyQuery, params);

      // Calculate running balance
      let runningBalance = 0;
      const historyWithBalance = historyResults.map(h => {
        runningBalance += h.Amount;
        return {
          id: h.Id,
          type: h.Type,
          date: h.Date instanceof Date ? h.Date.toISOString() : String(h.Date),
          amount: Math.abs(h.Amount),
          invoiceNumber: h.InvoiceNumber || undefined,
          notes: h.Notes || undefined,
          runningBalance,
        };
      });

      return NextResponse.json({
        success: true,
        customer: {
          id: customer.CustomerId,
          name: customer.CustomerName,
          phone: customer.CustomerPhone || undefined,
          email: customer.CustomerEmail || undefined,
          creditLimit: customer.CreditLimit,
          currentDebt: customer.CurrentDebt,
        },
        history: historyWithBalance,
      });
    }

    // Build conditions for summary report
    const conditions: string[] = ['c.StoreId = @storeId'];

    if (search) {
      conditions.push('(c.Name LIKE @search OR c.Phone LIKE @search)');
      params.search = `%${search}%`;
    }

    if (hasDebtOnly) {
      conditions.push('c.CurrentDebt > 0');
    }

    if (overCreditOnly) {
      conditions.push('c.CurrentDebt > c.CreditLimit AND c.CreditLimit > 0');
    }

    const whereClause = conditions.join(' AND ');

    // Get customer debt summary
    const summaryQuery = `
      SELECT 
        c.Id as CustomerId,
        c.Name as CustomerName,
        c.Phone as CustomerPhone,
        c.Email as CustomerEmail,
        c.CreditLimit,
        ISNULL(sales.TotalSales, 0) as TotalSales,
        ISNULL(payments.TotalPayments, 0) as TotalPayments,
        c.CurrentDebt,
        sales.LastTransactionDate,
        payments.LastPaymentDate
      FROM Customers c
      LEFT JOIN (
        SELECT 
          CustomerId,
          SUM(FinalAmount) as TotalSales,
          MAX(TransactionDate) as LastTransactionDate
        FROM Sales
        WHERE StoreId = @storeId
        GROUP BY CustomerId
      ) sales ON c.Id = sales.CustomerId
      LEFT JOIN (
        SELECT 
          CustomerId,
          SUM(Amount) as TotalPayments,
          MAX(PaymentDate) as LastPaymentDate
        FROM Payments
        WHERE StoreId = @storeId
        GROUP BY CustomerId
      ) payments ON c.Id = payments.CustomerId
      WHERE ${whereClause}
      ORDER BY c.CurrentDebt DESC
    `;

    const results = await query<CustomerDebtRecord>(summaryQuery, params);

    // Calculate totals
    const totals = results.reduce(
      (acc, row) => ({
        totalCustomers: acc.totalCustomers + 1,
        totalSales: acc.totalSales + row.TotalSales,
        totalPayments: acc.totalPayments + row.TotalPayments,
        totalDebt: acc.totalDebt + row.CurrentDebt,
      }),
      { totalCustomers: 0, totalSales: 0, totalPayments: 0, totalDebt: 0 }
    );

    // Count customers over credit limit
    const overCreditCount = results.filter(
      r => r.CreditLimit > 0 && r.CurrentDebt > r.CreditLimit
    ).length;

    return NextResponse.json({
      success: true,
      data: results.map(r => ({
        customerId: r.CustomerId,
        customerName: r.CustomerName,
        customerPhone: r.CustomerPhone || undefined,
        customerEmail: r.CustomerEmail || undefined,
        creditLimit: r.CreditLimit,
        totalSales: r.TotalSales,
        totalPayments: r.TotalPayments,
        currentDebt: r.CurrentDebt,
        lastTransactionDate: r.LastTransactionDate 
          ? (r.LastTransactionDate instanceof Date ? r.LastTransactionDate.toISOString() : String(r.LastTransactionDate))
          : undefined,
        lastPaymentDate: r.LastPaymentDate
          ? (r.LastPaymentDate instanceof Date ? r.LastPaymentDate.toISOString() : String(r.LastPaymentDate))
          : undefined,
        isOverCredit: r.CreditLimit > 0 && r.CurrentDebt > r.CreditLimit,
      })),
      totals,
      overCreditCount,
    });
  } catch (error) {
    console.error('Get debt report error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi lấy báo cáo công nợ' },
      { status: 500 }
    );
  }
}
