const SUPABASE_URL = window.APP_CONFIG?.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.APP_CONFIG?.SUPABASE_ANON_KEY;

if (!window.supabase) {
  throw new Error("Supabase CDN yuklenmedi. Script sirasini kontrol edin.");
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Supabase public config bulunamadi. js/config.js dosyasinin once yuklendigini kontrol edin.");
}

window.supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
