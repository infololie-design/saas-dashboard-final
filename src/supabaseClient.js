import { createClient } from '@supabase/supabase-js';

// BURAYA KENDİ URL VE KEY BİLGİLERİNİ GİR
const supabaseUrl = 'https://eeesifwezjcsunjbmxsz.supabase.co'; 
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZXNpZndlempjc3VuamJteHN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MjM2OTMsImV4cCI6MjA3OTk5OTY5M30.vRiReyGh1I4EoAWetVPkaX_AuxBt_Xwxb_E30jPzp0s'; // Senin paylaştığın key

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
