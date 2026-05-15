import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const password = formData.get('password');

  if (password === process.env.ADMIN_PASSWORD) {
    const res = NextResponse.redirect(new URL('/admin', req.url));
    res.cookies.set('admin_authed', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });
    return res;
  }

  const res = NextResponse.redirect(new URL('/admin?error=1', req.url));
  return res;
}
