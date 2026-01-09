import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    
    // Get session ID from cookie
    const sessionId = request.cookies.get('cart_session_id')?.value;
    
    const response = await fetch(`${API_URL}/storefront/${slug}/cart`, {
      headers: {
        'Content-Type': 'application/json',
        ...(sessionId && { 'X-Session-Id': sessionId }),
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      // Return empty cart if not found
      if (response.status === 404) {
        return NextResponse.json({
          cart: {
            id: '',
            items: [],
            subtotal: 0,
            discountAmount: 0,
            shippingFee: 0,
            total: 0,
            itemCount: 0,
          }
        });
      }
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error || 'Failed to fetch cart' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Storefront cart API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
