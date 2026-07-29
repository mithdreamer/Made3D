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

  const parseJsonSafely = async (response) => {
    try {
      return await response.json();
    } catch {
      return {};
    }
  };

  const SAFE_OBJECT_KEY_PATTERN =
    /^products\/(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/)?[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|jpeg|png|webp|avif)$/i;

  const normalizeObjectKey = (objectKey) => {
    const key = String(objectKey || "").trim().replace(/^\/+/, "");
    if (!key) return "";
    if (
      /^(data:|blob:|https?:)/i.test(key) ||
      key.includes("..") ||
      key.includes("//") ||
      !SAFE_OBJECT_KEY_PATTERN.test(key)
    ) {
      throw new Error("Gorsel object_key degeri gecersiz.");
    }
    return key;
  };

  const mediaDeleteUrl = (objectKey) => {
    const key = normalizeObjectKey(objectKey);
    if (!key) return "";

    const baseUrl = window.APP_CONFIG?.MEDIA_BASE_URL || "";
    if (!baseUrl) {
      throw new Error("Worker media adresi bulunamadi.");
    }

    return `${baseUrl}${encodeURIComponent(key)}`;
  };

  const getAdminAccessToken = async () => {
    let session = null;

    if (window.AdminAuth?.requireAdminSession) {
      session = await window.AdminAuth.requireAdminSession({ redirect: false });
    } else if (window.supabaseClient?.auth) {
      const { data, error } = await window.supabaseClient.auth.getSession();
      if (error) throw error;
      session = data.session;
    }

    if (!session?.access_token) {
      throw new Error("Gorsel islemi icin admin oturumu gerekiyor.");
    }

    return session.access_token;
  };

  const deleteRemoteObject = async (objectKey, token) => {
    const url = mediaDeleteUrl(objectKey);
    if (!url) return { skipped: true };

    const accessToken = token || (await getAdminAccessToken());
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const result = await parseJsonSafely(response);
    if (!response.ok) {
      throw new Error(result.error || result.message || `R2 gorseli silinemedi. HTTP ${response.status}`);
    }

    return result;
  };

  const compareImages = (a, b) =>
    (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0) ||
    String(a.createdAt || "").localeCompare(String(b.createdAt || "")) ||
    String(a.id || "").localeCompare(String(b.id || ""));

  const mapDatabaseImage = (image = {}) => ({
    id: image.id,
    productId: image.product_id || "",
    objectKey: image.object_key || "",
    src: image.object_key
      ? window.AppConfig?.mediaUrl(image.object_key) || ""
      : image.public_url || "",
    publicUrl: image.public_url || "",
    storageProvider: image.storage_provider || window.APP_CONFIG?.MEDIA_STORAGE_PROVIDER || "cloudflare_r2",
    bucketName: image.bucket_name || window.APP_CONFIG?.MEDIA_BUCKET_NAME || "made3d-media",
    originalName: image.original_file_name || "",
    contentType: image.mime_type || "",
    sizeBytes: Number(image.size_bytes) || 0,
    altText: image.alt_text || "",
    sortOrder: Number(image.sort_order) || 0,
    isPrimary: Boolean(image.is_primary),
    createdAt: image.created_at || "",
    updatedAt: image.updated_at || image.created_at || "",
    status: "saved"
  });

  const mapUploadToDatabase = (productId, image, index) => ({
    product_id: productId,
    storage_provider: image.storageProvider || window.APP_CONFIG?.MEDIA_STORAGE_PROVIDER || "cloudflare_r2",
    bucket_name: image.bucketName || window.APP_CONFIG?.MEDIA_BUCKET_NAME || "made3d-media",
    object_key: normalizeObjectKey(image.objectKey),
    public_url: image.publicUrl || null,
    original_file_name: image.originalName || "",
    mime_type: image.contentType || "",
    size_bytes: Number(image.sizeBytes) || 0,
    alt_text: image.altText || "",
    sort_order: Number.isFinite(Number(image.sortOrder)) ? Number(image.sortOrder) : index,
    is_primary: Boolean(image.isPrimary)
  });

  const getImagesByProductId = async (productId) => {
    if (!productId) return [];

    const { data, error } = await getClient()
      .from("product_images")
      .select("*")
      .eq("product_id", productId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      logSupabaseError("Urun gorselleri Supabase'den alinamadi:", error);
      throw new Error("Urun gorselleri yuklenirken bir hata olustu.");
    }

    return (data || []).map(mapDatabaseImage);
  };

  const getImageByObjectKey = async (objectKey) => {
    if (!objectKey) return null;

    const { data, error } = await getClient()
      .from("product_images")
      .select("*")
      .eq("object_key", objectKey)
      .maybeSingle();

    if (error) {
      logSupabaseError("Object key ile gorsel kaydi okunamadi:", error);
      return null;
    }

    return data ? mapDatabaseImage(data) : null;
  };

  const getImageByIdOrNull = async (imageId) => {
    if (!imageId) return null;

    const { data, error } = await getClient()
      .from("product_images")
      .select("*")
      .eq("id", imageId)
      .maybeSingle();

    if (error) {
      logSupabaseError("Urun gorseli Supabase'den alinamadi:", error);
      throw new Error("Gorsel bilgisi yuklenirken bir hata olustu.");
    }

    return data ? mapDatabaseImage(data) : null;
  };

  const createFailureError = (failedImages, createdImages) => {
    const names = failedImages
      .map((image) => image.originalName || image.objectKey || "gorsel")
      .join(", ");
    const error = new Error(`Bazi gorsel kayitlari olusturulamadi: ${names}`);
    error.failedImages = failedImages;
    error.createdImages = createdImages;
    error.cleanupFailures = failedImages.filter((image) => image.rollbackError);
    return error;
  };

  const createProductImages = async (productId, uploadedImages = []) => {
    const images = (Array.isArray(uploadedImages) ? uploadedImages : []).filter((image) => image?.objectKey);
    if (!productId || !images.length) return [];

    const createdImages = [];
    const failedImages = [];

    for (const [index, image] of images.entries()) {
      const payload = mapUploadToDatabase(productId, image, index);
      const { data, error } = await getClient()
        .from("product_images")
        .insert(payload)
        .select("*")
        .single();

      if (!error) {
        createdImages.push(mapDatabaseImage(data));
        continue;
      }

      logSupabaseError("Urun gorseli Supabase'e kaydedilemedi:", error);
      const existingImage = error.code === "23505" ? await getImageByObjectKey(image.objectKey) : null;
      if (existingImage?.productId === productId) {
        createdImages.push(existingImage);
        continue;
      }

      const failedImage = {
        ...image,
        status: "error",
        error: "Gorsel metadata kaydi olusturulamadi."
      };

      try {
        await deleteRemoteObject(image.objectKey);
      } catch (rollbackError) {
        console.error("R2 rollback tamamlanamadi:", {
          objectKey: image.objectKey,
          message: rollbackError?.message
        });
        failedImage.rollbackError = rollbackError.message || "R2 rollback tamamlanamadi.";
      }

      failedImages.push(failedImage);
    }

    if (failedImages.length) {
      throw createFailureError(failedImages, createdImages);
    }

    return createdImages;
  };

  const setPrimaryImage = async (productId, imageId) => {
    if (!productId || !imageId) {
      throw new Error("Ana gorsel icin urun ve gorsel bilgisi zorunludur.");
    }

    const existingImages = await getImagesByProductId(productId);
    const previousPrimary = existingImages.find((image) => image.isPrimary);

    const clear = await getClient()
      .from("product_images")
      .update({ is_primary: false, updated_at: new Date().toISOString() })
      .eq("product_id", productId)
      .neq("id", imageId);

    if (clear.error) {
      logSupabaseError("Ana gorsel sifirlanamadi:", clear.error);
      throw new Error("Ana gorsel guncellenirken bir hata olustu.");
    }

    const { data, error } = await getClient()
      .from("product_images")
      .update({ is_primary: true, updated_at: new Date().toISOString() })
      .eq("product_id", productId)
      .eq("id", imageId)
      .select("*")
      .single();

    if (error) {
      logSupabaseError("Ana gorsel atanamadi:", error);
      if (previousPrimary?.id && previousPrimary.id !== imageId) {
        const restore = await getClient()
          .from("product_images")
          .update({ is_primary: true, updated_at: new Date().toISOString() })
          .eq("product_id", productId)
          .eq("id", previousPrimary.id);
        if (restore.error) {
          logSupabaseError("Onceki ana gorsel geri alinamadi:", restore.error);
        }
      }
      throw new Error("Ana gorsel guncellenirken bir hata olustu.");
    }

    return mapDatabaseImage(data);
  };

  const ensurePrimaryImage = async (productId) => {
    const images = (await getImagesByProductId(productId)).sort(compareImages);
    if (!images.length) return images;

    const primaryImages = images.filter((image) => image.isPrimary).sort(compareImages);
    if (primaryImages.length === 1) return images;

    await setPrimaryImage(productId, primaryImages[0]?.id || images[0].id);
    return getImagesByProductId(productId);
  };

  const updateImageOrder = async (productId, orderedImageIds = []) => {
    if (!productId) return [];

    const ids = orderedImageIds.filter(Boolean);
    const updates = ids.map((imageId, index) =>
      getClient()
        .from("product_images")
        .update({ sort_order: index, updated_at: new Date().toISOString() })
        .eq("product_id", productId)
        .eq("id", imageId)
        .select("*")
        .single()
    );

    const results = await Promise.all(updates);
    const failed = results.find((result) => result.error);
    if (failed) {
      logSupabaseError("Gorsel sirasi guncellenemedi:", failed.error);
      throw new Error("Gorsel sirasi guncellenirken bir hata olustu.");
    }

    return results.map((result) => mapDatabaseImage(result.data));
  };

  const deleteDatabaseImage = async (imageId) => {
    const { data, error } = await getClient()
      .from("product_images")
      .delete()
      .eq("id", imageId)
      .select("*")
      .single();

    if (error) {
      logSupabaseError("Urun gorseli Supabase'den silinemedi:", error);
      throw new Error("Supabase gorsel kaydi silinemedi. Gorsel silme islemini tekrar deneyin.");
    }

    return mapDatabaseImage(data);
  };

  const deleteProductImage = async (imageId) => {
    if (!imageId) {
      throw new Error("Silinecek gorsel bulunamadi.");
    }

    const target = await getImageByIdOrNull(imageId);
    if (!target) {
      return { id: imageId, skipped: true, status: "already_deleted" };
    }

    const productId = target.productId;
    const replacement = target.isPrimary
      ? (await getImagesByProductId(productId))
          .filter((image) => image.id !== target.id)
          .sort(compareImages)[0]
      : null;

    // Delete R2 before mutating Supabase so a failed remote delete stays retryable.
    await deleteRemoteObject(target.objectKey);
    if (replacement?.id) {
      await setPrimaryImage(productId, replacement.id);
    }

    const deleted = await deleteDatabaseImage(imageId);
    await ensurePrimaryImage(productId);
    return deleted;
  };

  window.ProductImageRepository = {
    mapDatabaseImage,
    mapUploadToDatabase,
    getImagesByProductId,
    createProductImages,
    setPrimaryImage,
    ensurePrimaryImage,
    updateImageOrder,
    deleteProductImage,
    deleteRemoteObject
  };
})();
