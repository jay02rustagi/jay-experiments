import { supabase } from '@/lib/supabase';

// Pinged daily by the Vercel cron in vercel.json so the free-tier Supabase project never pauses
export const dynamic = 'force-dynamic';

export async function GET() {
    const { error } = await supabase.from('customers').select('id').limit(1);

    if (error) {
        console.error('Health check failed:', error.message);
        return Response.json({ ok: false }, { status: 503 });
    }

    return Response.json({ ok: true, checked_at: new Date().toISOString() });
}
