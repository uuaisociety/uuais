import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    
    // Get the password from environment variable with fallback
    const correctPassword = process.env.ADMIN_PASSWORD || 'NilsLuktar';
    
    if (password === correctPassword) {
      return NextResponse.json({ success: true });
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