const SUPABASE_URL = "https://zkrqlmdouceszgnkxnzh.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_U_MDve3jJvI7SUknt0czYw_bq-qa5ti";

if (!window.supabase) {
  throw new Error("Supabase CDN yuklenmedi. Script sirasini kontrol edin.");
}

window.supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
