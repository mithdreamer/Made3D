(function () {
  const maxImages = () => Number(window.APP_CONFIG?.MAX_PRODUCT_IMAGES) || 6;
  const maxBytes = () => Number(window.APP_CONFIG?.MAX_IMAGE_BYTES) || 10 * 1024 * 1024;
  const allowedTypes = () => new Set(window.APP_CONFIG?.ALLOWED_IMAGE_TYPES || []);

  const makeClientId = () =>
    `img-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  const itemKey = (item) => item?.clientId || item?.id || item?.objectKey || "";

  const formatBytes = (bytes) => {
    const size = Number(bytes) || 0;
    if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
    if (size >= 1024) return `${Math.round(size / 1024)} KB`;
    return `${size} B`;
  };

  const normalizeExistingImage = (image, index = 0) => ({
    id: image.id || "",
    clientId: image.clientId || "",
    productId: image.productId || "",
    objectKey: image.objectKey || "",
    src: image.src || window.AppConfig?.mediaUrl(image.objectKey) || image.publicUrl || "",
    publicUrl: image.publicUrl || "",
    storageProvider: image.storageProvider || window.APP_CONFIG?.MEDIA_STORAGE_PROVIDER || "cloudflare_r2",
    bucketName: image.bucketName || window.APP_CONFIG?.MEDIA_BUCKET_NAME || "made3d-media",
    originalName: image.originalName || "",
    contentType: image.contentType || "",
    sizeBytes: Number(image.sizeBytes) || 0,
    previewSrc: image.previewSrc || "",
    altText: image.altText || "",
    sortOrder: Number.isFinite(Number(image.sortOrder)) ? Number(image.sortOrder) : index,
    isPrimary: Boolean(image.isPrimary),
    status: image.status || "saved",
    error: image.error || ""
  });

  const ensurePrimary = (items) => {
    const list = [...items];
    if (list.length && !list.some((item) => item.isPrimary)) {
      list[0] = { ...list[0], isPrimary: true };
    }
    return list.map((item, index) => ({ ...item, sortOrder: index }));
  };

  const validateFile = (file) => {
    if (!file) return "Dosya okunamadi.";
    if (!allowedTypes().has(file.type)) {
      return "Sadece JPEG, PNG, WebP ve AVIF gorseller desteklenir.";
    }
    if (file.size > maxBytes()) {
      return `Gorsel basina en fazla ${formatBytes(maxBytes())} yuklenebilir.`;
    }
    return "";
  };

  const createPendingItems = (files, currentItems = []) => {
    const selectedFiles = Array.from(files || []);
    const slots = Math.max(0, maxImages() - currentItems.length);
    const errors = [];
    const items = [];

    if (selectedFiles.length > slots) {
      errors.push(`En fazla ${maxImages()} gorsel eklenebilir.`);
    }

    selectedFiles.slice(0, slots).forEach((file) => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
        return;
      }

      const previewSrc = URL.createObjectURL(file);
      items.push({
        clientId: makeClientId(),
        file,
        src: previewSrc,
        previewSrc,
        originalName: file.name,
        contentType: file.type,
        sizeBytes: file.size,
        altText: "",
        status: "pending",
        isPrimary: currentItems.length === 0 && items.length === 0,
        sortOrder: currentItems.length + items.length,
        error: ""
      });
    });

    return { items, errors };
  };

  const parseJsonSafely = async (response) => {
    try {
      return await response.json();
    } catch {
      return {};
    }
  };

  const pick = (source, keys) => {
    for (const key of keys) {
      if (source?.[key] !== undefined && source[key] !== null && source[key] !== "") {
        return source[key];
      }
    }
    return undefined;
  };

  const normalizeUploadResponse = (raw, fallback = {}) => {
    const source = raw?.data || raw?.image || raw?.file || raw || {};
    const objectKey = pick(source, ["objectKey", "object_key", "key", "path"]);
    if (!objectKey) {
      throw new Error("Worker cevabinda objectKey bilgisi bulunamadi.");
    }

    const contentType =
      pick(source, ["contentType", "content_type", "mimeType", "mime_type", "type"]) ||
      fallback.contentType ||
      "";

    const sizeBytes =
      Number(pick(source, ["sizeBytes", "size_bytes", "size", "bytes"])) ||
      Number(fallback.sizeBytes) ||
      0;

    return {
      clientId: fallback.clientId || "",
      objectKey,
      src: pick(source, ["src", "url", "publicUrl", "public_url"]) || window.AppConfig?.mediaUrl(objectKey) || "",
      publicUrl: pick(source, ["publicUrl", "public_url"]) || "",
      storageProvider:
        pick(source, ["storageProvider", "storage_provider"]) ||
        window.APP_CONFIG?.MEDIA_STORAGE_PROVIDER ||
        "cloudflare_r2",
      bucketName:
        pick(source, ["bucket", "bucketName", "bucket_name"]) ||
        window.APP_CONFIG?.MEDIA_BUCKET_NAME ||
        "made3d-media",
      sizeBytes,
      contentType,
      originalName: pick(source, ["originalName", "original_name", "originalFileName", "original_file_name"]) || fallback.originalName || "",
      previewSrc: fallback.previewSrc || "",
      altText: fallback.altText || "",
      sortOrder: fallback.sortOrder || 0,
      isPrimary: Boolean(fallback.isPrimary),
      status: "uploaded",
      error: ""
    };
  };

  const getUploadToken = async () => {
    let session = null;

    if (window.AdminAuth?.requireAdminSession) {
      session = await window.AdminAuth.requireAdminSession({ redirect: false });
    } else if (window.supabaseClient?.auth) {
      const { data, error } = await window.supabaseClient.auth.getSession();
      if (error) throw error;
      session = data.session;
    }

    if (!session?.access_token) {
      throw new Error("Gorsel yuklemek icin admin oturumu gerekiyor.");
    }

    return session.access_token;
  };

  const uploadProductImage = async (item, productId, token) => {
    if (!item?.file) throw new Error("Yuklenecek dosya bulunamadi.");
    if (!productId) throw new Error("Gorsel yuklemek icin urun kimligi gerekiyor.");

    const formData = new FormData();
    formData.append("file", item.file, item.originalName || item.file.name);
    formData.append("productId", productId);

    const response = await fetch(window.APP_CONFIG?.UPLOAD_URL || "", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    const result = await parseJsonSafely(response);
    if (!response.ok) {
      throw new Error(result.error || result.message || `Gorsel yuklenemedi. HTTP ${response.status}`);
    }

    return normalizeUploadResponse(result, item);
  };

  const uploadPendingImages = async (items, productId, callbacks = {}) => {
    const nextItems = [...items];
    const pending = nextItems.filter((item) => ["pending", "error"].includes(item.status) && item.file);
    const uploaded = [];
    const failed = [];

    if (!pending.length) {
      return { items: ensurePrimary(nextItems), uploaded, failed };
    }

    const token = await getUploadToken();

    for (const pendingItem of pending) {
      const index = nextItems.findIndex((item) => itemKey(item) === itemKey(pendingItem));
      nextItems[index] = { ...pendingItem, status: "uploading", error: "" };
      callbacks.onChange?.(ensurePrimary(nextItems));

      try {
        const uploadedImage = await uploadProductImage(nextItems[index], productId, token);
        nextItems[index] = { ...nextItems[index], ...uploadedImage };
        uploaded.push(nextItems[index]);
      } catch (error) {
        const failedItem = {
          ...nextItems[index],
          status: "error",
          error: error.message || "Gorsel yuklenemedi."
        };
        nextItems[index] = failedItem;
        failed.push(failedItem);
      }

      callbacks.onChange?.(ensurePrimary(nextItems));
    }

    return { items: ensurePrimary(nextItems), uploaded, failed };
  };

  const statusText = (item) => {
    if (item.status === "saved") return item.isPrimary ? "Ana gorsel" : "Kayitli";
    if (item.status === "pending") return item.isPrimary ? "Ana gorsel olarak bekliyor" : "Yukleme bekliyor";
    if (item.status === "uploading") return "Yukleniyor";
    if (item.status === "uploaded") return "Yuklendi";
    if (item.status === "error") return item.error || "Hata";
    return "";
  };

  const renderPreview = (container, items = []) => {
    if (!container) return;
    container.innerHTML = "";

    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "Henuz gorsel secilmedi.";
      container.appendChild(empty);
      return;
    }

    items.forEach((item, index) => {
      const card = document.createElement("article");
      card.className = `image-preview-card is-${item.status || "saved"}`;
      card.dataset.imageId = itemKey(item);

      const media = document.createElement("div");
      media.className = "image-preview-media";

      const image = document.createElement("img");
      image.src = window.Utils?.imageUrl(item.src) || item.src || "";
      image.alt = item.altText || item.originalName || `Urun gorseli ${index + 1}`;
      image.onerror = () => {
        image.onerror = null;
        image.src = window.Utils?.imageFallback?.() || "";
      };
      media.appendChild(image);

      if (item.isPrimary) {
        const badge = document.createElement("span");
        badge.className = "image-primary-badge";
        badge.textContent = "Ana";
        media.appendChild(badge);
      }

      const body = document.createElement("div");
      body.className = "image-preview-body";

      const name = document.createElement("strong");
      name.textContent = item.originalName || item.objectKey || "Gorsel";
      body.appendChild(name);

      const meta = document.createElement("span");
      meta.className = "muted";
      meta.textContent = [statusText(item), item.sizeBytes ? formatBytes(item.sizeBytes) : ""]
        .filter(Boolean)
        .join(" - ");
      body.appendChild(meta);

      const controls = document.createElement("div");
      controls.className = "image-preview-actions";

      const addButton = (label, action, disabled = false) => {
        const button = document.createElement("button");
        button.className = "btn btn-outline";
        button.type = "button";
        button.textContent = label;
        button.dataset.imageAction = action;
        button.dataset.imageId = itemKey(item);
        button.disabled = disabled;
        controls.appendChild(button);
      };

      addButton("Ana", "primary", item.isPrimary);
      addButton("Yukari", "up", index === 0);
      addButton("Asagi", "down", index === items.length - 1);
      addButton("Kaldir", "remove");

      card.appendChild(media);
      card.appendChild(body);
      card.appendChild(controls);
      container.appendChild(card);
    });
  };

  const filesToImages = async (files) => {
    const { items, errors } = createPendingItems(files, []);
    if (errors.length) throw new Error(errors.join("\n"));

    return Promise.all(
      items.map(
        (item) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = reject;
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(item.file);
          })
      )
    );
  };

  window.ImageUpload = {
    itemKey,
    maxImages,
    maxBytes,
    allowedTypes,
    formatBytes,
    normalizeExistingImage,
    ensurePrimary,
    createPendingItems,
    normalizeUploadResponse,
    getUploadToken,
    uploadPendingImages,
    renderPreview,
    filesToImages
  };
})();
