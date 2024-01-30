import { SUPABASE_URL, SUPABASE_KEY } from '$env/static/private';
import { createClient } from '@supabase/supabase-js';
import { json } from '@sveltejs/kit';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export async function GET() {
    let { data, error } = await supabase
    .from('ads_sell')
    .select()
    .order('created_at', { ascending: false });
    data = data.map(ad => ({ ...ad, section: 'sales' }));

    return json(data);
}
