export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { supabaseAdmin } from '@/lib/supabase';
import { ReportPDF } from '@/lib/pdf';
import { Report } from '@/types';

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const cookieStore = cookies();
  if (cookieStore.get('admin_authed')?.value !== 'true') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: report, error } = await supabaseAdmin
    .from('reports')
    .select('*')
    .eq('slug', params.slug)
    .single<Report>();

  if (error || !report) {
    return NextResponse.json({ error: 'Izvještaj nije pronađen.' }, { status: 404 });
  }

  const buffer = await renderToBuffer(
    // ReportPDF returns a <Document> element; cast satisfies renderToBuffer's type constraint
    React.createElement(ReportPDF, { report }) as unknown as Parameters<typeof renderToBuffer>[0]
  );

  const safeName = report.business_name.replace(/[^a-zA-Z0-9\-_]/g, '-');
  const filename = `${safeName}-izvjestaj.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
