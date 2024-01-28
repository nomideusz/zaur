import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_KEY } from '$env/static/public';
const supabaseUrl = 'http://188.68.236.198:8000'
const supabaseKey = process.env.PUBLIC_SUPABASE_KEY
export const supabase = createClient(supabaseUrl, supabaseKey)