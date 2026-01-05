import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, getStoreIdFromRequest, verifyStoreAccess } from '@/lib/auth';
import { categoryRepository } from '@/lib/repositories/category-repository';

interface RouteParams {
  params: Promise<{ categoryId: string }>;
}

/**
 * GET /api/categories/[categoryId] - Get a specific category
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await authenticateRequest(request);

    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    const { categoryId } = await params;
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

    const category = await categoryRepository.findById(categoryId, storeId);

    if (!category) {
      return NextResponse.json(
        { error: 'Không tìm thấy danh mục' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      category,
    });
  } catch (error) {
    console.error('Get category error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi lấy thông tin danh mục' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/categories/[categoryId] - Update a category
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await authenticateRequest(request);

    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    const { categoryId } = await params;
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

    // Check if category exists
    const existingCategory = await categoryRepository.findById(categoryId, storeId);
    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Không tìm thấy danh mục' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, description } = body;

    // Validate name if provided
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        return NextResponse.json(
          { error: 'Tên danh mục không hợp lệ' },
          { status: 400 }
        );
      }

      // Check if new name already exists (excluding current category)
      const nameExists = await categoryRepository.nameExists(name.trim(), storeId, categoryId);
      if (nameExists) {
        return NextResponse.json(
          { error: 'Tên danh mục đã tồn tại' },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || undefined;

    const updatedCategory = await categoryRepository.update(categoryId, updateData, storeId);

    return NextResponse.json({
      success: true,
      category: updatedCategory,
    });
  } catch (error) {
    console.error('Update category error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi cập nhật danh mục' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/categories/[categoryId] - Delete a category
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await authenticateRequest(request);

    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    const { categoryId } = await params;
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

    // Check if category exists
    const existingCategory = await categoryRepository.findById(categoryId, storeId);
    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Không tìm thấy danh mục' },
        { status: 404 }
      );
    }

    // Check if category is in use by any products
    const isInUse = await categoryRepository.isInUse(categoryId, storeId);
    if (isInUse) {
      return NextResponse.json(
        { error: 'Không thể xóa danh mục đang được sử dụng bởi sản phẩm' },
        { status: 400 }
      );
    }

    await categoryRepository.delete(categoryId, storeId);

    return NextResponse.json({
      success: true,
      message: 'Đã xóa danh mục thành công',
    });
  } catch (error) {
    console.error('Delete category error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi xóa danh mục' },
      { status: 500 }
    );
  }
}
