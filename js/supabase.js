const SUPABASE_URL = "https://zkrqlmdouceszgnkxnzh.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_U_MDve3jJvI7SUknt0czYw_bq-qa5ti";

window.supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

console.log("✅ Supabase hazır.");

(async () => {
    const { data, error } = await window.supabaseClient
        .from("storefront_products")
        .select("*")
        .limit(5);

    if (error) {
        console.error(error);
    } else {
        console.log("Supabase ürünleri:", data);
    }
})();