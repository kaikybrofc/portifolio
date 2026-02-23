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

const getJwtRole = (key) => {
  try {
    const segments = key.split('.');
    if (segments.length !== 3) return null;
    const payload = JSON.parse(atob(segments[1]));
    return payload?.role || null;
  } catch {
    return null;
  }
};

const isSecretKeyInBrowser =
  typeof supabaseAnonKey === 'string' &&
  (supabaseAnonKey.startsWith('sb_secret_') ||
    getJwtRole(supabaseAnonKey) === 'service_role');

export const hasSupabaseSecretInBrowser = isSecretKeyInBrowser;

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

export const isSupabaseConfigured =
  missingConfig.length === 0 && !isSecretKeyInBrowser;

if (missingConfig.length > 0) {
  console.error(
    `[Supabase] Configuracao ausente: ${missingConfig.join(', ')}. ` +
      'Defina essas variaveis de ambiente antes do build/deploy.'
  );
}

if (isSecretKeyInBrowser) {
  console.error(
    '[Supabase] Chave secreta detectada no frontend. ' +
      'Use apenas anon/publishable key no navegador.'
  );
}

const fallbackUrl = 'https://example.supabase.co';
const fallbackAnonKey = 'invalid-anon-key';

export const supabase = createClient(
  supabaseUrl || fallbackUrl,
  supabaseAnonKey || fallbackAnonKey
);
