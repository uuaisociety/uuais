import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-this'
);

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    
    // Require environment variable - no fallback
    const correctPassword = process.env.ADMIN_PASSWORD;
    
    if (!correctPassword) {
      console.error('ADMIN_PASSWORD environment variable not set');
      return NextResponse.json(
        { success: false, message: 'Server configuration error' }, 
        { status: 500 }
      );
    }
    
    if (password === correctPassword) {
      // Create JWT token
      const token = await new SignJWT({ role: 'admin' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(JWT_SECRET);
      
      // Set secure HTTP-only cookie
      const response = NextResponse.json({ success: true });
      response.cookies.set('admin-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 // 24 hours
      });
      
      return response;
    } else {
      return NextResponse.json(
        { success: false, message: 'Invalid password' }, 
        { status: 401 }
      );
    }
  } catch (err) {
    console.error('Authentication error:', err);
    return NextResponse.json(
      { success: false, message: 'Server error' }, 
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin-token')?.value;
    
    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    
    await jwtVerify(token, JWT_SECRET);
    return NextResponse.json({ authenticated: true });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('admin-token');
  return response;
} 