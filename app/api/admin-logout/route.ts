import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL('/admin', req.url));
  res.cookies.delete('admin_authed');
  return res;
}
