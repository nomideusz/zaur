import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
	'https://kbvgjpyrihzmqbmnvjdz.supabase.co',
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtidmdqcHlyaWh6bXFibW52amR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDUyOTAwMDEsImV4cCI6MjAyMDg2NjAwMX0.6Zy74XV_-O8PkTqz5wqyhQBfMu-GjEDSEG3gP1hwCYY'
);
