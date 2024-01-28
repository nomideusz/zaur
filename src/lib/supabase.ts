import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_KEY } from '$env/static/public';
let supabaseKey;

if (process.env.NODE_ENV === 'production') {
    // For production
    supabaseKey = process.env.PUBLIC_SUPABASE_KEY;
} else {
    // For development
    supabaseKey = PUBLIC_SUPABASE_KEY;
}
const supabaseUrl = 'http://188.68.236.198:8000'

export const supabase = createClient(supabaseUrl, supabaseKey)