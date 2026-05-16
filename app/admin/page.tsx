import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { Report } from '@/types';
import AdminClient from './AdminClient';

interface Props {
  searchParams: { error?: string; published?: string };
}

export default async function AdminPage({ searchParams }: Props) {
  const cookieStore = cookies();
  const authed = cookieStore.get('admin_authed')?.value === 'true';

  if (!authed) {
    return <AdminLoginGate hasError={searchParams.error === '1'} />;
  }

  const { data: reports } = await supabaseAdmin
    .from('reports')
    .select('id, slug, custom_slug, status, business_name, business_city, business_niche, created_at, open_count, opened_at')
    .order('created_at', { ascending: false })
    .returns<Report[]>();

  return (
    <AdminClient
      reports={reports ?? []}
      justPublished={searchParams.published === '1'}
    />
  );
}

function AdminLoginGate({ hasError }: { hasError: boolean }) {
  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        <h1 className="text-2xl font-bold text-slate-800 mb-6 text-center">Admin pristup</h1>
        <form action="/api/admin-login" method="POST" className="space-y-4">
          <input
            type="password"
            name="password"
            placeholder="Lozinka"
            className={`w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#F97316] ${
              hasError ? 'border-red-400 bg-red-50' : 'border-slate-200'
            }`}
            required
          />
          {hasError && (
            <p className="text-red-500 text-sm font-medium">Pogrešna lozinka. Pokušajte ponovo.</p>
          )}
          <button
            type="submit"
            className="w-full bg-[#F97316] hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors"
          >
            Prijava
          </button>
        </form>
      </div>
    </div>
  );
}
