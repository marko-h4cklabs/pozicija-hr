import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { NicheTemplate } from '@/types';

function isAdmin(req: NextRequest) {
  return req.cookies.get('admin_authed')?.value === 'true';
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('niche_templates')
    .select('*')
    .order('created_at', { ascending: false })
    .returns<NicheTemplate[]>();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { name, niche, competitors } = body as {
    name: string;
    niche: string;
    competitors: Array<{ name: string; url: string }>;
  };

  if (!name?.trim() || !niche?.trim()) {
    return NextResponse.json({ error: 'Naziv i djelatnost su obavezni.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('niche_templates')
    .insert({ name: name.trim(), niche, competitors: competitors ?? [] })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
