import { NextResponse } from 'next/server';
import createBoardApplicationAdmin from '@/lib/admin/boardApplications';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    // Expect JSON payload matching the admin helper shape (without id/createdAt)
    const body = await req.json();

    // Basic sanity checks so accidental empty calls are rejected
    if (!body || !body.name || !body.email) {
      return NextResponse.json({ error: 'name and email are required' }, { status: 400 });
    }

    const created = await createBoardApplicationAdmin({
      name: body.name,
      email: body.email,
      phone: body.phone || undefined,
      role: body.role,
      cv: body.cv || null,
      coverOption: body.coverOption || undefined,
      coverText: body.coverText || null,
      coverFile: body.coverFile || null,
    });

    return NextResponse.json(created);
  } catch (err) {
    console.error('admin test create error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
