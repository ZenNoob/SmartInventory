import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    
    // Get session ID from cookie
    const sessionId = request.cookies.get('cart_session_id')?.value;
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'No cart session found' },
        { status: 400 }
      );
    }
    
    const response = await fetch(`${API_URL}/storefront/${slug}/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Id': sessionId,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error || 'Failed to process checkout' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Clear cart session cookie after successful checkout
    const res = NextResponse.json(data);
    res.cookies.delete('cart_session_id');
    
    return res;
  } catch (error) {
    console.error('Storefront checkout API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
