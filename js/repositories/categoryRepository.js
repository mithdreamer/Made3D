(function () {
  const getClient = () => {
    if (!window.supabaseClient) {
      throw new Error("Supabase baglantisi bulunamadi. js/supabase.js dosyasinin once yuklendigini kontrol edin.");
    }

    return window.supabaseClient;
  };

  const logSupabaseError = (label, error) => {
    console.error(label, {
      code: error?.code,
      message: error?.message,
      details: error?.details,
      hint: error?.hint
    });
  };

  const mapDatabaseCategory = (category) => ({
    id: category.id,
    name: category.name || "",
    slug: category.slug || "",
    description: category.description || "",
    active: category.is_active !== false,
    sortOrder: Number(category.sort_order) || 0,
    createdAt: category.created_at || "",
    updatedAt: category.updated_at || category.created_at || ""
  });

  const mapCategoryToDatabase = (category) => ({
    name: category.name?.trim() || "",
    slug: category.slug?.trim() || "",
    description: category.description || "",
    is_active: category.active !== false,
    sort_order: Number(category.sortOrder) || 0,
    updated_at: new Date().toISOString()
  });

  const getCategories = async (options = {}) => {
    let query = getClient()
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (options.includeInactive !== true) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) {
      logSupabaseError("Kategoriler Supabase'den alinamadi:", error);
      throw new Error("Kategoriler yuklenirken bir hata olustu.");
    }

    return (data || []).map(mapDatabaseCategory);
  };

  const getCategoryById = async (categoryId, options = {}) => {
    if (!categoryId) return null;

    let query = getClient()
      .from("categories")
      .select("*")
      .eq("id", categoryId);

    if (options.includeInactive !== true) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      logSupabaseError("Kategori Supabase'den alinamadi:", error);
      throw new Error("Kategori bilgisi yuklenirken bir hata olustu.");
    }

    return data ? mapDatabaseCategory(data) : null;
  };

  const getCategoryBySlug = async (slug, options = {}) => {
    if (!slug) return null;

    let query = getClient()
      .from("categories")
      .select("*")
      .eq("slug", slug);

    if (options.includeInactive !== true) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      logSupabaseError("Kategori Supabase'den alinamadi:", error);
      throw new Error("Kategori bilgisi yuklenirken bir hata olustu.");
    }

    return data ? mapDatabaseCategory(data) : null;
  };

  const upsertCategory = async (category) => {
    if (!category?.name?.trim()) {
      throw new Error("Kategori adi zorunludur.");
    }

    const payload = mapCategoryToDatabase(category);
    let query;

    if (category.id) {
      query = getClient()
        .from("categories")
        .update(payload)
        .eq("id", category.id);
    } else {
      query = getClient()
        .from("categories")
        .insert(payload);
    }

    const { data, error } = await query.select("*").single();

    if (error) {
      logSupabaseError("Kategori Supabase'e kaydedilemedi:", error);
      throw new Error("Kategori kaydedilirken bir hata olustu.");
    }

    return mapDatabaseCategory(data);
  };

  const deleteCategory = async (categoryId) => {
    if (!categoryId) {
      throw new Error("Silinecek kategori bulunamadi.");
    }

    const { data, error } = await getClient()
      .from("categories")
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq("id", categoryId)
      .select("*")
      .single();

    if (error) {
      logSupabaseError("Kategori pasif hale getirilemedi:", error);
      throw new Error("Kategori silinirken bir hata olustu.");
    }

    return mapDatabaseCategory(data);
  };

  window.CategoryRepository = {
    mapDatabaseCategory,
    mapCategoryToDatabase,
    getCategories,
    getCategoryById,
    getCategoryBySlug,
    upsertCategory,
    deleteCategory
  };
})();
