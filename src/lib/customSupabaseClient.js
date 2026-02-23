import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

const missingConfig = [];
if (!supabaseUrl) {
  missingConfig.push('VITE_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL');
}
if (!supabaseAnonKey) {
  missingConfig.push(
    'VITE_SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY/' +
      'VITE_SUPABASE_PUBLISHABLE_KEY/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/' +
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY'
  );
}

export const isSupabaseConfigured = missingConfig.length === 0;

if (!isSupabaseConfigured) {
  console.error(
    `[Supabase] Configuracao ausente: ${missingConfig.join(', ')}. ` +
      'Defina essas variaveis de ambiente antes do build/deploy.'
  );
}

const fallbackUrl = 'https://example.supabase.co';
const fallbackAnonKey = 'invalid-anon-key';

export const supabase = createClient(
  supabaseUrl || fallbackUrl,
  supabaseAnonKey || fallbackAnonKey
);
