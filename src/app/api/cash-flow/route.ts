import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, getStoreIdFromRequest, verifyStoreAccess } from '@/lib/auth';
import { cashTransactionRepository } from '@/lib/repositories/cash-transaction-repository';

/**
 * GET /api/cash-flow - Get all cash transactions for a store
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

    // Verify user has access to this store
    const hasAccess = await verifyStoreAccess(authResult.user.userId, storeId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Bạn không có quyền truy cập cửa hàng này' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);
    const type = url.searchParams.get('type') as 'thu' | 'chi' | null;
    const category = url.searchParams.get('category') || undefined;
    const dateFrom = url.searchParams.get('dateFrom') || undefined;
    const dateTo = url.searchParams.get('dateTo') || undefined;
    const orderBy = url.searchParams.get('orderBy') || 'TransactionDate';
    const orderDirection = (url.searchParams.get('orderDirection') || 'DESC') as 'ASC' | 'DESC';
    const includeSummary = url.searchParams.get('includeSummary') === 'true';

    const result = await cashTransactionRepository.findAllFiltered(storeId, {
      page,
      pageSize,
      type: type || undefined,
      category,
      dateFrom,
      dateTo,
      orderBy,
      orderDirection,
    });

    // Optionally include summary
    let summary = undefined;
    if (includeSummary) {
      summary = await cashTransactionRepository.getSummary(storeId, dateFrom, dateTo);
    }

    return NextResponse.json({
      success: true,
      ...result,
      summary,
    });
  } catch (error) {
    console.error('Get cash transactions error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi lấy danh sách phiếu thu chi' },
      { status: 500 }
    );
  }
}


/**
 * POST /api/cash-flow - Create a new cash transaction
 */
export async function POST(request: NextRequest) {
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

    // Verify user has access to this store
    const hasAccess = await verifyStoreAccess(authResult.user.userId, storeId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Bạn không có quyền truy cập cửa hàng này' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { type, transactionDate, amount, reason, category, relatedInvoiceId } = body;

    // Validate required fields
    if (!type || !['thu', 'chi'].includes(type)) {
      return NextResponse.json(
        { error: 'Loại phiếu không hợp lệ (thu hoặc chi)' },
        { status: 400 }
      );
    }

    if (!transactionDate) {
      return NextResponse.json(
        { error: 'Ngày giao dịch là bắt buộc' },
        { status: 400 }
      );
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Số tiền phải lớn hơn 0' },
        { status: 400 }
      );
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: 'Lý do là bắt buộc' },
        { status: 400 }
      );
    }

    // Create cash transaction
    const transaction = await cashTransactionRepository.create(
      {
        type,
        transactionDate,
        amount,
        reason: reason.trim(),
        category: category?.trim() || undefined,
        relatedInvoiceId: relatedInvoiceId || undefined,
        createdBy: authResult.user.userId,
      },
      storeId
    );

    return NextResponse.json({
      success: true,
      transaction,
    }, { status: 201 });
  } catch (error) {
    console.error('Create cash transaction error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Đã xảy ra lỗi khi tạo phiếu thu chi';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/cash-flow - Update an existing cash transaction
 */
export async function PUT(request: NextRequest) {
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

    // Verify user has access to this store
    const hasAccess = await verifyStoreAccess(authResult.user.userId, storeId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Bạn không có quyền truy cập cửa hàng này' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, type, transactionDate, amount, reason, category, relatedInvoiceId } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID phiếu là bắt buộc' },
        { status: 400 }
      );
    }

    // Validate fields if provided
    if (type && !['thu', 'chi'].includes(type)) {
      return NextResponse.json(
        { error: 'Loại phiếu không hợp lệ (thu hoặc chi)' },
        { status: 400 }
      );
    }

    if (amount !== undefined && (typeof amount !== 'number' || amount <= 0)) {
      return NextResponse.json(
        { error: 'Số tiền phải lớn hơn 0' },
        { status: 400 }
      );
    }

    if (reason !== undefined && !reason.trim()) {
      return NextResponse.json(
        { error: 'Lý do không được để trống' },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (type !== undefined) updateData.type = type;
    if (transactionDate !== undefined) updateData.transactionDate = transactionDate;
    if (amount !== undefined) updateData.amount = amount;
    if (reason !== undefined) updateData.reason = reason.trim();
    if (category !== undefined) updateData.category = category?.trim() || undefined;
    if (relatedInvoiceId !== undefined) updateData.relatedInvoiceId = relatedInvoiceId || undefined;

    // Update cash transaction
    const transaction = await cashTransactionRepository.update(id, updateData, storeId);

    return NextResponse.json({
      success: true,
      transaction,
    });
  } catch (error) {
    console.error('Update cash transaction error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Đã xảy ra lỗi khi cập nhật phiếu thu chi';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cash-flow - Delete a cash transaction
 */
export async function DELETE(request: NextRequest) {
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

    // Verify user has access to this store
    const hasAccess = await verifyStoreAccess(authResult.user.userId, storeId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Bạn không có quyền truy cập cửa hàng này' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID phiếu là bắt buộc' },
        { status: 400 }
      );
    }

    // Delete cash transaction
    const deleted = await cashTransactionRepository.delete(id, storeId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Không tìm thấy phiếu hoặc không có quyền xóa' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Đã xóa phiếu thu chi thành công',
    });
  } catch (error) {
    console.error('Delete cash transaction error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Đã xảy ra lỗi khi xóa phiếu thu chi';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
