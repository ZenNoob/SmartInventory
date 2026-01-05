import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, getStoreIdFromRequest, verifyStoreAccess } from '@/lib/auth';
import { query } from '@/lib/db';

interface ProfitByProductRecord {
  ProductId: string;
  ProductName: string;
  Barcode: string | null;
  CategoryName: string | null;
  UnitName: string | null;
  TotalQuantity: number;
  TotalRevenue: number;
  TotalCost: number;
  TotalProfit: number;
  ProfitMargin: number;
}

interface ProfitByDateRecord {
  TransactionDate: Date;
  TotalRevenue: number;
  TotalCost: number;
  TotalProfit: number;
  SalesCount: number;
}

interface ProfitByCategoryRecord {
  CategoryId: string;
  CategoryName: string;
  TotalQuantity: number;
  TotalRevenue: number;
  TotalCost: number;
  TotalProfit: number;
  ProductCount: number;
}

/**
 * GET /api/reports/profit - Get profit report with various aggregations
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
    const groupBy = url.searchParams.get('groupBy') || 'product'; // product, date, category
    const categoryId = url.searchParams.get('categoryId');
    const search = url.searchParams.get('search');

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

    if (categoryId) {
      conditions.push('p.CategoryId = @categoryId');
      params.categoryId = categoryId;
    }

    if (search) {
      conditions.push('(p.Name LIKE @search OR p.Barcode LIKE @search)');
      params.search = `%${search}%`;
    }

    const whereClause = conditions.join(' AND ');

    let responseData: Record<string, unknown> = { success: true };

    if (groupBy === 'date') {
      // Profit by date
      const profitByDateQuery = `
        SELECT 
          CAST(s.TransactionDate AS DATE) as TransactionDate,
          SUM(si.Quantity * si.Price) as TotalRevenue,
          SUM(si.Quantity * ISNULL(si.Cost, 0)) as TotalCost,
          SUM(si.Quantity * si.Price) - SUM(si.Quantity * ISNULL(si.Cost, 0)) as TotalProfit,
          COUNT(DISTINCT s.Id) as SalesCount
        FROM Sales s
        INNER JOIN SalesItems si ON s.Id = si.SalesId
        INNER JOIN Products p ON si.ProductId = p.Id
        WHERE ${whereClause}
        GROUP BY CAST(s.TransactionDate AS DATE)
        ORDER BY CAST(s.TransactionDate AS DATE) ASC
      `;

      const dateResults = await query<ProfitByDateRecord>(profitByDateQuery, params);

      const totals = dateResults.reduce(
        (acc, row) => ({
          totalRevenue: acc.totalRevenue + row.TotalRevenue,
          totalCost: acc.totalCost + row.TotalCost,
          totalProfit: acc.totalProfit + row.TotalProfit,
          totalSales: acc.totalSales + row.SalesCount,
        }),
        { totalRevenue: 0, totalCost: 0, totalProfit: 0, totalSales: 0 }
      );

      responseData = {
        success: true,
        data: dateResults.map(r => ({
          date: r.TransactionDate instanceof Date ? r.TransactionDate.toISOString() : String(r.TransactionDate),
          totalRevenue: r.TotalRevenue,
          totalCost: r.TotalCost,
          totalProfit: r.TotalProfit,
          salesCount: r.SalesCount,
          profitMargin: r.TotalRevenue > 0 ? (r.TotalProfit / r.TotalRevenue) * 100 : 0,
        })),
        totals: {
          ...totals,
          profitMargin: totals.totalRevenue > 0 ? (totals.totalProfit / totals.totalRevenue) * 100 : 0,
        },
      };
    } else if (groupBy === 'category') {
      // Profit by category
      const profitByCategoryQuery = `
        SELECT 
          c.Id as CategoryId,
          c.Name as CategoryName,
          SUM(si.Quantity) as TotalQuantity,
          SUM(si.Quantity * si.Price) as TotalRevenue,
          SUM(si.Quantity * ISNULL(si.Cost, 0)) as TotalCost,
          SUM(si.Quantity * si.Price) - SUM(si.Quantity * ISNULL(si.Cost, 0)) as TotalProfit,
          COUNT(DISTINCT p.Id) as ProductCount
        FROM Sales s
        INNER JOIN SalesItems si ON s.Id = si.SalesId
        INNER JOIN Products p ON si.ProductId = p.Id
        INNER JOIN Categories c ON p.CategoryId = c.Id
        WHERE ${whereClause}
        GROUP BY c.Id, c.Name
        ORDER BY TotalProfit DESC
      `;

      const categoryResults = await query<ProfitByCategoryRecord>(profitByCategoryQuery, params);

      const totals = categoryResults.reduce(
        (acc, row) => ({
          totalQuantity: acc.totalQuantity + row.TotalQuantity,
          totalRevenue: acc.totalRevenue + row.TotalRevenue,
          totalCost: acc.totalCost + row.TotalCost,
          totalProfit: acc.totalProfit + row.TotalProfit,
          totalProducts: acc.totalProducts + row.ProductCount,
        }),
        { totalQuantity: 0, totalRevenue: 0, totalCost: 0, totalProfit: 0, totalProducts: 0 }
      );

      responseData = {
        success: true,
        data: categoryResults.map(r => ({
          categoryId: r.CategoryId,
          categoryName: r.CategoryName,
          totalQuantity: r.TotalQuantity,
          totalRevenue: r.TotalRevenue,
          totalCost: r.TotalCost,
          totalProfit: r.TotalProfit,
          productCount: r.ProductCount,
          profitMargin: r.TotalRevenue > 0 ? (r.TotalProfit / r.TotalRevenue) * 100 : 0,
        })),
        totals: {
          ...totals,
          profitMargin: totals.totalRevenue > 0 ? (totals.totalProfit / totals.totalRevenue) * 100 : 0,
        },
      };
    } else {
      // Default: Profit by product
      const profitByProductQuery = `
        SELECT 
          p.Id as ProductId,
          p.Name as ProductName,
          p.Barcode,
          c.Name as CategoryName,
          u.Name as UnitName,
          SUM(si.Quantity) as TotalQuantity,
          SUM(si.Quantity * si.Price) as TotalRevenue,
          SUM(si.Quantity * ISNULL(si.Cost, 0)) as TotalCost,
          SUM(si.Quantity * si.Price) - SUM(si.Quantity * ISNULL(si.Cost, 0)) as TotalProfit,
          CASE 
            WHEN SUM(si.Quantity * si.Price) > 0 
            THEN ((SUM(si.Quantity * si.Price) - SUM(si.Quantity * ISNULL(si.Cost, 0))) / SUM(si.Quantity * si.Price)) * 100
            ELSE 0 
          END as ProfitMargin
        FROM Sales s
        INNER JOIN SalesItems si ON s.Id = si.SalesId
        INNER JOIN Products p ON si.ProductId = p.Id
        LEFT JOIN Categories c ON p.CategoryId = c.Id
        LEFT JOIN Units u ON p.UnitId = u.Id
        WHERE ${whereClause}
        GROUP BY p.Id, p.Name, p.Barcode, c.Name, u.Name
        ORDER BY TotalProfit DESC
      `;

      const productResults = await query<ProfitByProductRecord>(profitByProductQuery, params);

      const totals = productResults.reduce(
        (acc, row) => ({
          totalQuantity: acc.totalQuantity + row.TotalQuantity,
          totalRevenue: acc.totalRevenue + row.TotalRevenue,
          totalCost: acc.totalCost + row.TotalCost,
          totalProfit: acc.totalProfit + row.TotalProfit,
          totalProducts: acc.totalProducts + 1,
        }),
        { totalQuantity: 0, totalRevenue: 0, totalCost: 0, totalProfit: 0, totalProducts: 0 }
      );

      responseData = {
        success: true,
        data: productResults.map(r => ({
          productId: r.ProductId,
          productName: r.ProductName,
          barcode: r.Barcode || undefined,
          categoryName: r.CategoryName || undefined,
          unitName: r.UnitName || undefined,
          totalQuantity: r.TotalQuantity,
          totalRevenue: r.TotalRevenue,
          totalCost: r.TotalCost,
          totalProfit: r.TotalProfit,
          profitMargin: r.ProfitMargin,
        })),
        totals: {
          ...totals,
          profitMargin: totals.totalRevenue > 0 ? (totals.totalProfit / totals.totalRevenue) * 100 : 0,
        },
      };
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Get profit report error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi lấy báo cáo lợi nhuận' },
      { status: 500 }
    );
  }
}
