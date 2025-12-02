import { createClient } from '@supabase/supabase-js';

// BURAYA KENDİ URL VE KEY BİLGİLERİNİ GİR
const supabaseUrl = 'sb_publishable_tE_U041JjJ12n2lfoKG5WA_2C9ue8Dh'; 
const supabaseAnonKey = 'sb_secret_3fdFRQQT6tDZ_xvN0iJOgg_38VvdA-U'; // Senin paylaştığın key

export const supabase = createClient(supabaseUrl, supabaseAnonKey);