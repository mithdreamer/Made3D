(function () {
  const getClient = () => {
    if (!window.supabaseClient) {
      throw new Error(
        "Supabase baglantisi bulunamadi. js/supabase.js dosyasinin once yuklendigini kontrol edin."
      );
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

  const getActiveColors = async () => {
    const { data, error } = await getClient()
      .from("color_master")
      .select("code, name_en, name_tr, hex_code, display_order, is_active")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) {
      logSupabaseError("Aktif renkler alınamadı:", error);
      throw new Error("Renk seçenekleri yüklenirken bir hata oluştu.");
    }

    return data || [];
  };

  const getAllColors = async () => {
    const { data, error } = await getClient()
      .from("color_master")
      .select("code, name_en, name_tr, hex_code, display_order, is_active")
      .order("display_order", { ascending: true });

    if (error) {
      logSupabaseError("Renkler alınamadı:", error);
      throw new Error("Renk listesi yüklenirken bir hata oluştu.");
    }

    return data || [];
  };

  const updateColorActiveStatus = async (colorCode, isActive) => {
    if (!colorCode) {
      throw new Error("Güncellenecek renk bulunamadı.");
    }

    const { error } = await getClient()
      .from("color_master")
      .update({ is_active: Boolean(isActive) })
      .eq("code", colorCode);

    if (error) {
      logSupabaseError("Renk satış durumu güncellenemedi:", error);
      throw new Error("Rengin satış durumu güncellenirken bir hata oluştu.");
    }

    return {
      code: colorCode,
      is_active: Boolean(isActive)
    };
  };

  const getProductColors = async (productId) => {
    if (!productId) {
      return [];
    }

    const { data, error } = await getClient()
      .from("product_colors")
      .select(`
        product_id,
        color_code,
        is_primary,
        display_order,
        color_master (
          code,
          name_en,
          name_tr,
          hex_code,
          is_active
        )
      `)
      .eq("product_id", productId)
      .order("display_order", { ascending: true });

    if (error) {
      logSupabaseError("Ürün renkleri alınamadı:", error);
      throw new Error("Ürünün renkleri yüklenirken bir hata oluştu.");
    }

    return data || [];
  };

  const replaceProductColors = async (productId, colors = []) => {
    if (!productId) {
      throw new Error("Renklerin bağlanacağı ürün bulunamadı.");
    }

    const normalizedColors = Array.from(
      new Map(
        colors
          .filter((color) => color?.color_code)
          .map((color, index) => [
            color.color_code,
            {
              product_id: productId,
              color_code: String(color.color_code).trim(),
              is_primary: Boolean(color.is_primary),
              display_order: Number.isInteger(Number(color.display_order))
                ? Number(color.display_order)
                : index
            }
          ])
      ).values()
    );

    if (
      normalizedColors.length > 0 &&
      !normalizedColors.some((color) => color.is_primary)
    ) {
      normalizedColors[0].is_primary = true;
    }

    let primaryFound = false;

    normalizedColors.forEach((color, index) => {
      if (color.is_primary && !primaryFound) {
        primaryFound = true;
      } else if (color.is_primary) {
        color.is_primary = false;
      }

      color.display_order = index;
    });

    const { error: deleteError } = await getClient()
      .from("product_colors")
      .delete()
      .eq("product_id", productId);

    if (deleteError) {
      logSupabaseError("Eski ürün renkleri silinemedi:", deleteError);
      throw new Error("Ürün renkleri güncellenirken bir hata oluştu.");
    }

    if (normalizedColors.length === 0) {
      return [];
    }

    const { data, error: insertError } = await getClient()
      .from("product_colors")
      .insert(normalizedColors)
      .select("*");

    if (insertError) {
      logSupabaseError("Ürün renkleri kaydedilemedi:", insertError);
      throw new Error("Ürün renkleri kaydedilirken bir hata oluştu.");
    }

    return data || [];
  };

  window.ProductColorRepository = {
    getAllColors,
    getActiveColors,
    updateColorActiveStatus,
    getProductColors,
    replaceProductColors
  };
})();
