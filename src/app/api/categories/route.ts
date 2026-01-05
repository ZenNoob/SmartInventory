import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, getStoreIdFromRequest, verifyStoreAccess } from '@/lib/auth';
import { categoryRepository } from '@/lib/repositories/category-repository';

/**
 * GET /api/categories - Get all categories for a store
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

    // Check if we should include product count
    const url = new URL(request.url);
    const includeProductCount = url.searchParams.get('includeProductCount') === 'true';

    let categories;
    if (includeProductCount) {
      categories = await categoryRepository.findAllWithProductCount(storeId);
    } else {
      categories = await categoryRepository.findAll(storeId, { orderBy: 'Name', orderDirection: 'ASC' });
    }

    return NextResponse.json({
      success: true,
      categories,
    });
  } catch (error) {
    console.error('Get categories error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi lấy danh sách danh mục' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/categories - Create a new category
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
    const { name, description } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Tên danh mục là bắt buộc' },
        { status: 400 }
      );
    }

    // Check if category name already exists
    const nameExists = await categoryRepository.nameExists(name.trim(), storeId);
    if (nameExists) {
      return NextResponse.json(
        { error: 'Tên danh mục đã tồn tại' },
        { status: 400 }
      );
    }

    // Create the category
    const category = await categoryRepository.create(
      {
        name: name.trim(),
        description: description?.trim() || undefined,
      },
      storeId
    );

    return NextResponse.json({
      success: true,
      category,
    }, { status: 201 });
  } catch (error) {
    console.error('Create category error:', error);
    return NextResponse.json(
      { error: 'Đã xảy ra lỗi khi tạo danh mục' },
      { status: 500 }
    );
  }
}
