(function () {
  const MEDIA_BASE_URL =
      "https://made3d-upload-service.korhanors.workers.dev/media/";

    const getMediaUrl = (objectKey) => {
      if (!objectKey) return "";
      return `${MEDIA_BASE_URL}${objectKey}`;
    };

  const getClient = () => {
    if (!window.supabaseClient) {
      throw new Error("Supabase bağlantısı bulunamadı. js/supabase.js dosyasının önce yüklendiğini kontrol edin.");
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

  const mapDatabaseProduct = (product, includeInactive = false) => ({
    id: product.id,
    name: product.name || "",
    slug: product.slug || "",
    sku: product.product_code || "",
    categoryId: product.category_id || "",
    categoryName: product.category_name || "",
    categorySlug: product.category_slug || "",
    shortDescription: product.short_description || "",
    description: product.description || "",
    price: Number(product.price) || 0,
    oldPrice: Number(product.old_price) || 0,
    stock: Number(product.stock) || 0,
    currencyCode: product.currency_code || "TRY",
    baseUnit: product.base_unit || "adet",
    active: includeInactive ? product.is_active !== false : true,
    featured: Boolean(product.is_featured),
    images: product.primary_image_object_key
      ? [getMediaUrl(product.primary_image_object_key)]
      : product.primary_image_url
        ? [product.primary_image_url]
        : [],
    primaryImageUrl: product.primary_image_object_key
      ? getMediaUrl(product.primary_image_object_key)
      : product.primary_image_url || "",
    primaryImageAlt: product.primary_image_alt || product.name || "",
    createdAt: product.created_at || "",
    updatedAt: product.updated_at || product.created_at || ""
  });

  const mapProductToDatabase = (product) => {
    const payload = {
      product_code: product.sku || "",
      name: product.name?.trim() || "",
      slug: product.slug?.trim() || "",
      category_id: product.categoryId || null,
      short_description: product.shortDescription || "",
      description: product.description || "",
      price: Number(product.price) || 0,
      old_price:
        product.oldPrice === "" ||
        product.oldPrice === null ||
        product.oldPrice === undefined
          ? null
          : Number(product.oldPrice),
      stock: Number(product.stock) || 0,
      currency_code: product.currencyCode || "TRY",
      base_unit: product.baseUnit || "adet",
      is_active: product.active !== false,
      is_featured: Boolean(product.featured),
      updated_at: new Date().toISOString()
    };

    if (!payload.slug) {
      delete payload.slug;
    }

    return payload;
  };

  const getProducts = async (options = {}) => {
    const includeInactive = options.includeInactive === true;
    const source = includeInactive ? "products" : "storefront_products";

    const { data, error } = await getClient()
      .from(source)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      logSupabaseError("Ürünler Supabase'den alınamadı:", error);
      throw new Error("Ürünler yüklenirken bir hata oluştu.");
    }

    return (data || []).map((product) =>
      mapDatabaseProduct(product, includeInactive)
    );
  };

  const getProductById = async (productId, options = {}) => {
    if (!productId) return null;

    const includeInactive = options.includeInactive === true;
    const source = includeInactive ? "products" : "storefront_products";

    const { data, error } = await getClient()
      .from(source)
      .select("*")
      .eq("id", productId)
      .maybeSingle();

    if (error) {
      logSupabaseError("Ürün Supabase'den alınamadı:", error);
      throw new Error("Ürün bilgisi yüklenirken bir hata oluştu.");
    }

    return data ? mapDatabaseProduct(data, includeInactive) : null;
  };

  const getProductBySlug = async (slug, options = {}) => {
    if (!slug) return null;

    const includeInactive = options.includeInactive === true;
    const source = includeInactive ? "products" : "storefront_products";

    const { data, error } = await getClient()
      .from(source)
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      logSupabaseError("Ürün Supabase'den alınamadı:", error);
      throw new Error("Ürün bilgisi yüklenirken bir hata oluştu.");
    }

    return data ? mapDatabaseProduct(data, includeInactive) : null;
  };

  const upsertProduct = async (product) => {
    if (!product?.name?.trim()) {
      throw new Error("Ürün adı zorunludur.");
    }

    const payload = mapProductToDatabase(product);
    let query;

    if (product.id) {
      query = getClient()
        .from("products")
        .update(payload)
        .eq("id", product.id);
    } else {
      query = getClient()
        .from("products")
        .insert(payload);
    }

    const { data, error } = await query.select("*").single();

    if (error) {
      logSupabaseError("Ürün Supabase'e kaydedilemedi:", error);
      throw new Error("Ürün kaydedilirken bir hata oluştu.");
    }

    return mapDatabaseProduct(data, true);
  };

  const deleteProduct = async (productId) => {
    if (!productId) {
      throw new Error("Silinecek ürün bulunamadı.");
    }

    const { data, error } = await getClient()
      .from("products")
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq("id", productId)
      .select("*")
      .single();

    if (error) {
      logSupabaseError("Ürün pasif hale getirilemedi:", error);
      throw new Error("Ürün silinirken bir hata oluştu.");
    }

    return mapDatabaseProduct(data, true);
  };

  const updateStock = async (productId, quantityOrDelta) => {
    if (!productId) {
      throw new Error("Stok güncellenecek ürün bulunamadı.");
    }

    let nextStock;

    if (
      quantityOrDelta &&
      typeof quantityOrDelta === "object" &&
      Object.prototype.hasOwnProperty.call(quantityOrDelta, "delta")
    ) {
      const currentProduct = await getProductById(productId, { includeInactive: true });
      if (!currentProduct) {
        throw new Error("Stok gÃ¼ncellenecek Ã¼rÃ¼n bulunamadÄ±.");
      }
      nextStock = Math.max(0, (Number(currentProduct.stock) || 0) + (Number(quantityOrDelta.delta) || 0));
    } else {
      nextStock = Math.max(0, Number(quantityOrDelta) || 0);
    }

    const { data, error } = await getClient()
      .from("products")
      .update({
        stock: nextStock,
        updated_at: new Date().toISOString()
      })
      .eq("id", productId)
      .select("*")
      .single();

    if (error) {
      logSupabaseError("Ürün stoku güncellenemedi:", error);
      throw new Error("Ürün stoku güncellenirken bir hata oluştu.");
    }

    return mapDatabaseProduct(data, true);
  };

  window.ProductRepository = {
    mapDatabaseProduct,
    mapProductToDatabase,
    getProducts,
    getProductById,
    getProductBySlug,
    upsertProduct,
    deleteProduct,
    updateStock
  };
})();
