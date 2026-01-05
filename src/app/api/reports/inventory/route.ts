import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, getStoreIdFromRequest, verifyStoreAccess } from '@/lib/auth';
import { query } from '@/lib/db';

interface InventoryReportRecord {
  ProductId: string;
  ProductName: string;
  Barcode: string | null;
  CategoryName: string | null;
  UnitName: string | null;
  OpeningStock: number;
  ImportStock: number;
  ExportStock: number;
  ClosingStock: number;
  AverageCost: number;
  StockValue: number;
  LowStockThreshold: number | null;
}

/**
 * GET /api/reports/inventory - Get inventory report with FIFO stock calculation
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
    const categoryId = url.searchParams.get('categoryId');
    const search = url.searchParams.get('search');
    const lowStockOnly = url.searchParams.get('lowStockOnly') === 'true';

    const params: Record<string, unknown> = { storeId };

    // Build product filter conditions
    const productConditions: string[] = ['p.StoreId = @storeId', "p.Status = 'active'"];
    
    if (categoryId) {
      productConditions.push('p.CategoryId = @categoryId');
      params.categoryId = categoryId;
    }

    if (search) {
      productConditions.push('(p.Name LIKE @search OR p.Barcode LIKE @search)');
      params.search = `%${search}%`;
    }

    const productWhereClause = productConditions.join(' AND ');

    // Build date conditions for opening/closing calculations
    let openingDateCondition = '';
    let periodDateCondition = '';
    let closingDateCondition = '';

    if (dateFrom) {
      openingDateCondition = 'AND pl.ImportDate < @dateFrom';
      periodDateCondition = 'AND pl.ImportDate >= @dateFrom';
      params.dateFrom = new Date(dateFrom);
    }

    if (dateTo) {
      periodDateCondition += ' AND pl.ImportDate <= @dateTo';
      closingDateCondition = 'AND pl.ImportDate <= @dateTo';
      params.dateTo = new Date(dateTo);
    }

    // Complex query to calculate opening, import, export, and closing stock
    const inventoryQuery = `
      WITH ProductBase AS (
        SELECT 
          p.Id as ProductId,
          p.Name as ProductName,
          p.Barcode,
          c.Name as CategoryName,
          u.Name as UnitName,
          p.LowStockThreshold
        FROM Products p
        LEFT JOIN Categories c ON p.CategoryId = c.Id
        LEFT JOIN Units u ON p.UnitId = u.Id
        WHERE ${productWhereClause}
      ),
      OpeningStock AS (
        SELECT 
          pl.ProductId,
          SUM(pl.Quantity) as TotalImport
        FROM PurchaseLots pl
        WHERE pl.StoreId = @storeId ${openingDateCondition}
        GROUP BY pl.ProductId
      ),
      OpeningExport AS (
        SELECT 
          si.ProductId,
          SUM(si.Quantity) as TotalExport
        FROM SalesItems si
        INNER JOIN Sales s ON si.SalesId = s.Id
        WHERE s.StoreId = @storeId ${dateFrom ? 'AND s.TransactionDate < @dateFrom' : ''}
        GROUP BY si.ProductId
      ),
      PeriodImport AS (
        SELECT 
          pl.ProductId,
          SUM(pl.Quantity) as TotalImport,
          CASE 
            WHEN SUM(pl.Quantity) > 0 
            THEN SUM(pl.Quantity * pl.Cost) / SUM(pl.Quantity)
            ELSE 0 
          END as AvgCost
        FROM PurchaseLots pl
        WHERE pl.StoreId = @storeId ${periodDateCondition}
        GROUP BY pl.ProductId
      ),
      PeriodExport AS (
        SELECT 
          si.ProductId,
          SUM(si.Quantity) as TotalExport
        FROM SalesItems si
        INNER JOIN Sales s ON si.SalesId = s.Id
        WHERE s.StoreId = @storeId 
          ${dateFrom ? 'AND s.TransactionDate >= @dateFrom' : ''}
          ${dateTo ? 'AND s.TransactionDate <= @dateTo' : ''}
        GROUP BY si.ProductId
      ),
      CurrentStock AS (
        SELECT 
          pl.ProductId,
          SUM(pl.RemainingQuantity) as TotalStock,
          CASE 
            WHEN SUM(pl.RemainingQuantity) > 0 
            THEN SUM(pl.RemainingQuantity * pl.Cost) / SUM(pl.RemainingQuantity)
            ELSE 0 
          END as AvgCost
        FROM PurchaseLots pl
        WHERE pl.StoreId = @storeId AND pl.RemainingQuantity > 0
        GROUP BY pl.ProductId
      )
      SELECT 
        pb.ProductId,
        pb.ProductName,
        pb.Barcode,
        pb.CategoryName,
        pb.UnitName,
        pb.LowStockThreshold,
        ISNULL(os.TotalImport, 0) - ISNULL(oe.TotalExport, 0) as OpeningStock,
        ISNULL(pi.TotalImport, 0) as ImportStock,
        ISNULL(pe.TotalExport, 0) as ExportStock,
        (ISNULL(os.TotalImport, 0) - ISNULL(oe.TotalExport, 0)) + ISNULL(pi.TotalImport, 0) - ISNULL(pe.TotalExport, 0) as ClosingStock,
        ISNULL(cs.AvgCost, ISNULL(pi.AvgCost, 0)) as AverageCost,
        ISNULL(cs.TotalStock, 0) * ISNULL(cs.AvgCost, 0) as StockValue
      FROM ProductBase pb
      LEFT JOIN OpeningStock os ON pb.ProductId = os.ProductId
      LEFT JOIN OpeningExport oe ON pb.ProductId = oe.ProductId
      LEFT JOIN PeriodImport pi ON pb.ProductId = pi.ProductId
      LEFT JOIN PeriodExport pe ON pb.ProductId = pe.ProductId
      LEFT JOIN CurrentStock cs ON pb.ProductId = cs.ProductId
      ${lowStockOnly ? 'WHERE ISNULL(cs.TotalStock, 0) <= ISNULL(pb.LowStockThreshold, 10)' : ''}
      ORDER BY pb.ProductName
    `;

    const results = await query<InventoryReportRecord>(inventoryQuery, params);

    // Calculate totals
    const totals = results.reduce(
      (acc, row) => ({
        totalProducts: acc.totalProducts + 1,
        totalOpeningStock: acc.totalOpeningStock + row.OpeningStock,
        totalImportStock: acc.totalImportStock + row.ImportStock,
        totalExportStock: acc.totalExportStock + row.ExportStock,
        totalClosingStock: acc.totalClosingStock + row.ClosingStock,
        totalStockValue: acc.totalStockValue + row.StockValue,
      }),
      { totalProducts: 0, totalOpeningStock: 0, totalImportStock: 0, totalExportStock: 0, totalClosingStock: 0, totalStockValue: 0 }
    );

    // Count low stock products
    const lowStockCount = results.filter(
      r => r.ClosingStock <= (r.LowStockThreshold || 10)
    ).length;

    return NextResponse.json({
      success: true,
      data: results.map(r => ({
        productId: r.ProductId,
        productName: r.ProductName,
        barcode: r.Barcode || undefined,
        categoryName: r.CategoryName || undefined,
        unitName: r.UnitName || undefined,
        openingStock: r.OpeningStock,
        importStock: r.ImportStock,
        exportStock: r.ExportStock,
        closingStock: r.ClosingStock,
        averageCost: r.AverageCost,
        stockValue: r.StockValue,
        lowStockThreshold: r.LowStockThreshold || 10,
        isLowStock: r.ClosingStock <= (r.LowStockThreshold || 10),
      })),
      totals,
      lowStockCount,
    });
  } catch (error) {
    console.error('Get inventory report error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi lấy báo cáo tồn kho' },
      { status: 500 }
    );
  }
}
