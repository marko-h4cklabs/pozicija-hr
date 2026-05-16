import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import { Report } from '@/types';
import ReviewClient from './ReviewClient';

interface Props {
  params: { slug: string };
}

export default async function ReviewPage({ params }: Props) {
  const cookieStore = cookies();
  if (cookieStore.get('admin_authed')?.value !== 'true') {
    redirect('/admin');
  }

  const { data: report } = await supabaseAdmin
    .from('reports')
    .select('*')
    .eq('slug', params.slug)
    .single<Report>();

  if (!report) return notFound();

  return <ReviewClient report={report} />;
}
