(function () {
  const KEYS = {
    orders: "MAde3D.orders",
    settings: "MAde3D.settings",
    paymentSettings: "MAde3D.paymentSettings",
    shippingSettings: "MAde3D.shippingSettings",
    cart: "MAde3D.cart"
  };

  const seed = () => window.ECommerceSeed || {};
  const clone = (value) => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));
  const REMOTE_STORE_URL = String(window.APP_CONFIG?.REMOTE_STORE_URL || "").trim();
  const REMOTE_KEYS = new Set([KEYS.settings]);
  let remoteAvailable = true;
  let remoteWriteTimer = null;
  let applyingRemoteState = false;
  let productCache = [];
  let categoryCache = [];

  const paymentDefaults = {
    enabled: false,
    activeProvider: "iyzico",
    mode: "test",
    methods: {
      creditCard: true,
      bankTransfer: true,
      cashOnDelivery: true
    },
    credentials: {
      merchantId: "",
      apiKey: "",
      secretKey: ""
    },
    callbackUrl: "",
    installments: {
      enabled: true,
      maxCount: 6,
      minAmount: 500
    },
    cardStorage: {
      enabled: false
    },
    bankTransfer: {
      bankName: "MAde3D Demo Bank",
      accountHolder: "MAde3D",
      iban: "TR00 0000 0000 0000 0000 0000 00"
    }
  };

  const shippingDefaults = {
    defaultCarrier: "yurtici",
    mode: "manual",
    trackingRequired: true,
    customerTrackingVisible: true,
    labelFormat: "a4",
    defaultDesi: 1,
    credentials: {
      apiUsername: "",
      apiPasswordToken: "",
      customerCode: "",
      branchCode: ""
    },
    sender: {
      name: "MAde3D Atolye",
      phone: "+90 555 123 45 67",
      address: "Istanbul, Turkiye"
    },
    carriers: [
      {
        id: "yurtici",
        name: "Yurtici",
        active: true,
        integrationReady: true,
        trackingUrl: ""
      },
      {
        id: "aras",
        name: "Aras",
        active: true,
        integrationReady: true,
        trackingUrl: ""
      },
      {
        id: "mng",
        name: "MNG / DHL eCommerce",
        active: true,
        integrationReady: true,
        trackingUrl: ""
      },
      {
        id: "ptt",
        name: "PTT",
        active: false,
        integrationReady: true,
        trackingUrl: ""
      },
      {
        id: "ups",
        name: "UPS",
        active: false,
        integrationReady: true,
        trackingUrl: ""
      },
      {
        id: "other",
        name: "Diger",
        active: false,
        integrationReady: false,
        trackingUrl: ""
      }
    ]
  };

  const read = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : clone(fallback);
    } catch (error) {
      console.warn("Local veri okunamadi:", key, error);
      return clone(fallback);
    }
  };

  const writeLocal = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
    return value;
  };

  const isLocalStaticHost = () =>
    ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);

  const remoteSupported = () =>
    typeof window.fetch === "function" &&
    window.location.protocol !== "file:" &&
    Boolean(REMOTE_STORE_URL) &&
    !isLocalStaticHost() &&
    remoteAvailable;

  const publicSettings = (settings = {}) => {
    const { adminUsername, adminPassword, ...sharedSettings } = settings || {};
    return sharedSettings;
  };

  const sanitizeStoredSettings = () => {
    const settings = read(KEYS.settings, seed().settings || {});
    const sanitized = publicSettings(settings);
    if ("adminUsername" in settings || "adminPassword" in settings) {
      writeLocal(KEYS.settings, sanitized);
    }
    return sanitized;
  };

  const catalogSnapshot = () => ({
    settings: publicSettings(read(KEYS.settings, seed().settings || {}))
  });

  const persistRemoteCatalog = async () => {
    if (!remoteSupported()) return;

    try {
      const response = await fetch(REMOTE_STORE_URL, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(catalogSnapshot())
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      remoteAvailable = false;
      console.info("Ortak ayar deposuna yazilamadi; yerel kayit kullanilacak.", error);
    }
  };

  const queueRemotePersist = (key) => {
    if (!REMOTE_KEYS.has(key) || applyingRemoteState || !remoteSupported()) return;
    window.clearTimeout(remoteWriteTimer);
    remoteWriteTimer = window.setTimeout(persistRemoteCatalog, 300);
  };

  const syncRemoteCatalog = async () => {
    window.clearTimeout(remoteWriteTimer);
    await persistRemoteCatalog();
  };

  const write = (key, value) => {
    writeLocal(key, value);
    queueRemotePersist(key);
    return value;
  };

  const makeId = (prefix) =>
    `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  const slugify = (value) =>
    String(value || "")
      .toLocaleLowerCase("tr-TR")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ı/g, "i")
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ş/g, "s")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const init = () => {
    const data = seed();
    if (!localStorage.getItem(KEYS.settings)) writeLocal(KEYS.settings, data.settings || {});
    sanitizeStoredSettings();
    if (!localStorage.getItem(KEYS.paymentSettings)) writeLocal(KEYS.paymentSettings, data.paymentSettings || paymentDefaults);
    if (!localStorage.getItem(KEYS.shippingSettings)) writeLocal(KEYS.shippingSettings, data.shippingSettings || shippingDefaults);
    if (!localStorage.getItem(KEYS.orders)) writeLocal(KEYS.orders, data.orders || []);
    if (!localStorage.getItem(KEYS.cart)) writeLocal(KEYS.cart, []);
    productCache = localProducts({ includeInactive: true });
    categoryCache = localCategories({ includeInactive: true });
  };

  const applyRemoteCatalog = (data = {}) => {
    applyingRemoteState = true;
    try {
      if (data.settings && typeof data.settings === "object") {
        writeLocal(KEYS.settings, {
          ...read(KEYS.settings, seed().settings || {}),
          ...publicSettings(data.settings)
        });
      }
    } finally {
      applyingRemoteState = false;
    }
  };

  const hydrateRemoteCatalog = async () => {
    if (!remoteSupported()) return;

    try {
      const response = await fetch(REMOTE_STORE_URL, { cache: "no-store" });
      if (response.status === 404) {
        remoteAvailable = false;
        return;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      applyRemoteCatalog(await response.json());
    } catch (error) {
      remoteAvailable = false;
      console.info("Ortak ayar deposu okunamadi; yerel veri kullanilacak.", error);
    }
  };

  const getSettings = () => publicSettings({ ...(seed().settings || {}), ...read(KEYS.settings, seed().settings || {}) });
  const saveSettings = (settings) => write(KEYS.settings, publicSettings({ ...getSettings(), ...settings }));
  const getDefaultPaymentSettings = () => clone(seed().paymentSettings || paymentDefaults);
  const getPaymentSettings = () => ({
    ...getDefaultPaymentSettings(),
    ...read(KEYS.paymentSettings, getDefaultPaymentSettings())
  });
  const savePaymentSettings = (settings) => write(KEYS.paymentSettings, { ...getPaymentSettings(), ...settings });
  const getDefaultShippingSettings = () => clone(seed().shippingSettings || shippingDefaults);
  const mergeCarriers = (defaultCarriers = [], savedCarriers = []) => {
    const savedById = new Map(
      (Array.isArray(savedCarriers) ? savedCarriers : [])
        .filter((carrier) => carrier?.id)
        .map((carrier) => [carrier.id, carrier])
    );
    const merged = defaultCarriers.map((defaultCarrier) => {
      const savedCarrier = savedById.get(defaultCarrier.id) || {};
      return {
        ...defaultCarrier,
        ...savedCarrier,
        name: defaultCarrier.name,
        integrationReady: defaultCarrier.integrationReady
      };
    });

    savedById.forEach((savedCarrier, carrierId) => {
      if (!merged.some((carrier) => carrier.id === carrierId)) merged.push(savedCarrier);
    });

    return merged;
  };
  const mergeShippingSettings = (defaults, settings = {}) => {
    const source = settings || {};
    return {
      ...defaults,
      ...source,
      mode: source.mode === "integration-ready" ? "own-contract" : source.mode || defaults.mode || "manual",
      sender: {
        ...(defaults.sender || {}),
        ...(source.sender || {})
      },
      credentials: {
        ...(defaults.credentials || {}),
        ...(source.credentials || {})
      },
      carriers: mergeCarriers(defaults.carriers || [], source.carriers || [])
    };
  };
  const getShippingSettings = () => {
    const defaults = getDefaultShippingSettings();
    return mergeShippingSettings(defaults, read(KEYS.shippingSettings, defaults));
  };
  const saveShippingSettings = (settings) => {
    const defaults = getDefaultShippingSettings();
    const source = settings?.carriers ? settings : { ...getShippingSettings(), ...settings };
    return write(KEYS.shippingSettings, mergeShippingSettings(defaults, source));
  };

  const setCategoryCache = (categories) => {
    categoryCache = Array.isArray(categories) ? clone(categories) : [];
    return categoryCache;
  };

  const setProductCache = (products) => {
    productCache = Array.isArray(products) ? clone(products) : [];
    return productCache;
  };

  function localCategories(options = {}) {
    const categories = clone(seed().categories || []);
    return options.includeInactive ? categories : categories.filter((category) => category.active !== false);
  }

  function localProducts(options = {}) {
    const categories = new Map(localCategories({ includeInactive: true }).map((category) => [category.id, category]));
    const products = clone(seed().products || []).map((product) => {
      const category = categories.get(product.categoryId);
      return {
        ...product,
        categoryName: product.categoryName || category?.name || "",
        categorySlug: product.categorySlug || category?.slug || ""
      };
    });
    return options.includeInactive ? products : products.filter((product) => product.active !== false);
  }

  const getCachedCategories = (options = {}) => {
    const categories = categoryCache.length ? categoryCache : localCategories({ includeInactive: true });
    return options.includeInactive ? clone(categories) : clone(categories.filter((category) => category.active !== false));
  };

  const getCachedProducts = (options = {}) => {
    const products = productCache.length ? productCache : localProducts({ includeInactive: true });
    return options.includeInactive ? clone(products) : clone(products.filter((product) => product.active !== false));
  };

  const requireProductRepository = () => {
    if (!window.ProductRepository) {
      throw new Error("ProductRepository yuklenmedi. Script sirasini kontrol edin.");
    }
    return window.ProductRepository;
  };

  const requireProductImageRepository = () => {
    if (!window.ProductImageRepository) {
      throw new Error("ProductImageRepository yuklenmedi. Script sirasini kontrol edin.");
    }
    return window.ProductImageRepository;
  };

  const requireProductColorRepository = () => {
  if (!window.ProductColorRepository) {
    throw new Error("ProductColorRepository yuklenmedi. Script sirasini kontrol edin.");
  }

  return window.ProductColorRepository;
  };

  const requireCategoryRepository = () => {
    if (!window.CategoryRepository) {
      throw new Error("CategoryRepository yuklenmedi. Script sirasini kontrol edin.");
    }
    return window.CategoryRepository;
  };

  const getCategories = async (options = {}) => {
    if (!window.CategoryRepository) return localCategories(options);
    const categories = await window.CategoryRepository.getCategories(options);
    setCategoryCache(options.includeInactive ? categories : await window.CategoryRepository.getCategories({ includeInactive: true }));
    return categories;
  };

  const getCategoryById = async (categoryId, options = {}) => {
    if (!categoryId) return null;
    if (!window.CategoryRepository) {
      return localCategories(options).find((category) => category.id === categoryId) || null;
    }
    return window.CategoryRepository.getCategoryById(categoryId, options);
  };

  const getCategoryBySlug = async (slug, options = {}) => {
    if (!slug) return null;
    if (!window.CategoryRepository) {
      return localCategories(options).find((category) => category.slug === slug || category.id === slug) || null;
    }
    return window.CategoryRepository.getCategoryBySlug(slug, options);
  };

  const upsertCategory = async (category) => {
    const repository = requireCategoryRepository();
    if (!category?.name?.trim()) throw new Error("Kategori adi zorunludur.");

    const saved = await repository.upsertCategory({
      ...category,
      id: category.id || undefined,
      slug: category.slug || slugify(category.name),
      active: category.active !== false
    });

    await getCategories({ includeInactive: true });
    return saved;
  };

  const deleteCategory = async (categoryId) => {
    if (!categoryId) throw new Error("Silinecek kategori bulunamadi.");
    const products = await getProducts({ includeInactive: true });
    const used = products.some((product) => product.categoryId === categoryId && product.active !== false);
    if (used) {
      throw new Error("Bu kategoriye bagli urunler var. Once urunlerin kategorisini degistirin.");
    }

    const deleted = await requireCategoryRepository().deleteCategory(categoryId);
    await getCategories({ includeInactive: true });
    return deleted;
  };

  const getProducts = async (options = {}) => {
    if (!window.ProductRepository) return localProducts(options);
    const products = await window.ProductRepository.getProducts(options);
    setProductCache(options.includeInactive ? products : await window.ProductRepository.getProducts({ includeInactive: true }));
    return products;
  };

  const getProductById = async (productId, options = {}) => {
    if (!productId) return null;
    if (!window.ProductRepository) {
      return localProducts(options).find((product) => product.id === productId) || null;
    }
    return window.ProductRepository.getProductById(productId, options);
  };

  const getProductBySlug = async (slug, options = {}) => {
    if (!slug) return null;
    if (!window.ProductRepository) {
      return localProducts(options).find((product) => product.slug === slug || product.id === slug) || null;
    }

    const product = await window.ProductRepository.getProductBySlug(slug, options);
    if (product) return product;
    return window.ProductRepository.getProductById(slug, options);
  };

  const getProductBySku = async (sku, options = {}) => {
    const normalizedSku = String(sku || "").trim();
    if (!normalizedSku) return null;
    if (!window.ProductRepository) {
      return localProducts(options).find(
        (product) => String(product.sku || "").trim() === normalizedSku
      ) || null;
    }
    return window.ProductRepository.getProductBySku(normalizedSku, options);
  };

  const upsertProduct = async (product) => {
    const repository = requireProductRepository();
    if (!product?.name?.trim()) throw new Error("Urun adi zorunludur.");

    const saved = await repository.upsertProduct({
      ...product,
      id: product.id || undefined,
      slug: product.slug || slugify(product.name),
      active: product.active !== false
    });

    await getProducts({ includeInactive: true });
    return saved;
  };

  const deleteProduct = async (productId) => {
    if (!productId) throw new Error("Silinecek urun bulunamadi.");
    const deleted = await requireProductRepository().deleteProduct(productId);
    setCart(getCart().filter((line) => line.productId !== productId));
    await getProducts({ includeInactive: true });
    return deleted;
  };

  const updateProductStock = async (productId, quantityOrDelta) =>
    requireProductRepository().updateStock(productId, quantityOrDelta);

  const getProductImages = async (productId) => {
    if (!window.ProductImageRepository) return [];
    return window.ProductImageRepository.getImagesByProductId(productId);
  };

  const createProductImages = async (productId, uploadedImages) =>
    requireProductImageRepository().createProductImages(productId, uploadedImages);

  const setPrimaryProductImage = async (productId, imageId) =>
    requireProductImageRepository().setPrimaryImage(productId, imageId);

  const updateProductImageOrder = async (productId, orderedImageIds) =>
    requireProductImageRepository().updateImageOrder(productId, orderedImageIds);

  const deleteProductImage = async (imageId) =>
    requireProductImageRepository().deleteProductImage(imageId);
  const getActiveColors = async () =>
  requireProductColorRepository().getActiveColors();

  const getAllColors = async () =>
  requireProductColorRepository().getAllColors();

  const updateColorActiveStatus = async (colorCode, isActive) =>
  requireProductColorRepository().updateColorActiveStatus(colorCode, isActive);

  const getProductColors = async (productId) =>
  requireProductColorRepository().getProductColors(productId);

  const replaceProductColors = async (productId, colors) =>
  requireProductColorRepository().replaceProductColors(productId, colors);

  const getLineProductId = (line = {}) =>
    line.productId || line.product_id || line.id || line.product?.id || "";

  const normalizeCartLine = (line = {}) => {
    const productId = getLineProductId(line);
    const quantity = Math.max(1, Number(line.quantity) || 1);
    const nextLine = { productId, quantity };
    if (line.variant) nextLine.variant = line.variant;
    if (line.variantId) nextLine.variantId = line.variantId;
    return productId ? nextLine : null;
  };

  const getCart = () =>
    (Array.isArray(read(KEYS.cart, [])) ? read(KEYS.cart, []) : [])
      .map(normalizeCartLine)
      .filter(Boolean);

  const setCart = (cart) => write(KEYS.cart, (Array.isArray(cart) ? cart : []).map(normalizeCartLine).filter(Boolean));

  const availableStock = (product) => {
    const stock = Number(product?.stock);
    return Number.isFinite(stock) ? stock : 0;
  };

  const ensureProductCanBePurchased = (product, quantity) => {
    if (!product) throw new Error("Urun bulunamadi.");
    if (product.active === false) throw new Error("Bu urun satis icin aktif degil.");
    const stock = availableStock(product);
    if (stock <= 0) throw new Error("Urun stokta yok.");
    if (quantity > stock) throw new Error(`Stok yetersiz. En fazla ${stock} adet ekleyebilirsiniz.`);
  };

  const addToCart = async (productId, quantity = 1, options = {}) => {
    const nextQuantity = Math.max(1, Number(quantity) || 1);
    const product = await getProductById(productId);
    ensureProductCanBePurchased(product, nextQuantity);

    const assignedColors = await getProductColors(productId);
    const activeColors = assignedColors.filter((row) => row.color_master?.is_active === true);
    const selectedColor = activeColors.find((row) => row.color_code === options.colorCode);

    if (assignedColors.length && !activeColors.length) {
      throw new Error("Bu urunun renk secenekleri su anda satisa kapali.");
    }
    if (activeColors.length && !selectedColor) {
      throw new Error("Lutfen urun detay sayfasindan bir renk secin.");
    }

    const cart = getCart();
    const colorCode = selectedColor?.color_code || "";
    const colorName = selectedColor
      ? selectedColor.color_master?.name_tr || selectedColor.color_master?.name_en || colorCode
      : "";
    const line = cart.find((item) => item.productId === productId && (item.variantId || "") === colorCode);
    const currentQuantity = Number(line?.quantity) || 0;
    const totalQuantity = currentQuantity + nextQuantity;
    ensureProductCanBePurchased(product, totalQuantity);

    if (line) line.quantity = totalQuantity;
    else cart.push({
      productId,
      quantity: nextQuantity,
      variantId: colorCode || undefined,
      variant: colorName || undefined
    });
    return setCart(cart);
  };

  const removeFromCart = (productId, variantId = "") =>
    setCart(getCart().filter((line) => !(line.productId === productId && (line.variantId || "") === variantId)));
  const removeCartItem = removeFromCart;
  const clearCart = () => setCart([]);

  const updateCartItem = async (productId, quantity, variantId = "") => {
    const nextQuantity = Number(quantity);
    if (nextQuantity <= 0) return removeFromCart(productId);

    const product = await getProductById(productId);
    ensureProductCanBePurchased(product, nextQuantity);

    const cart = getCart().map((line) =>
      line.productId === productId && (line.variantId || "") === variantId
        ? { ...line, quantity: nextQuantity }
        : line
    );
    return setCart(cart);
  };

  const editCartItem = async (productId, currentVariantId = "", changes = {}) => {
    const nextQuantity = Math.max(1, Number(changes.quantity) || 1);
    const product = await getProductById(productId);
    ensureProductCanBePurchased(product, nextQuantity);
    const assignedColors = await getProductColors(productId);
    const activeColors = assignedColors.filter((row) => row.color_master?.is_active === true);
    const requestedVariantId = String(changes.variantId || "");
    const selectedColor = activeColors.find((row) => row.color_code === requestedVariantId);
    if (assignedColors.length && !activeColors.length) throw new Error("Bu urunun renk secenekleri su anda satisa kapali.");
    if (activeColors.length && !selectedColor) throw new Error("Lutfen gecerli bir renk secin.");
    const cart = getCart();
    const sourceIndex = cart.findIndex((line) => line.productId === productId && (line.variantId || "") === currentVariantId);
    if (sourceIndex < 0) throw new Error("Duzenlenecek sepet urunu bulunamadi.");
    const nextVariantId = selectedColor?.color_code || "";
    const targetIndex = cart.findIndex((line, index) => index !== sourceIndex && line.productId === productId && (line.variantId || "") === nextVariantId);
    const mergedQuantity = nextQuantity + (targetIndex >= 0 ? Number(cart[targetIndex].quantity) || 0 : 0);
    ensureProductCanBePurchased(product, mergedQuantity);
    const nextLine = { productId, quantity: mergedQuantity, variantId: nextVariantId || undefined, variant: selectedColor ? selectedColor.color_master?.name_tr || selectedColor.color_master?.name_en || nextVariantId : undefined };
    if (targetIndex >= 0) { cart[targetIndex] = nextLine; cart.splice(sourceIndex, 1); } else { cart[sourceIndex] = nextLine; }
    return setCart(cart);
  };

  const getCartItems = async () => {
    const products = await getProducts({ includeInactive: true });
    const productsById = new Map(products.map((product) => [product.id, product]));

    return getCart()
      .map((line) => {
        const product = productsById.get(line.productId);
        if (!product) return null;
        return {
          productId: product.id,
          name: product.name,
          slug: product.slug,
          image: product.images?.[0] || product.primaryImageUrl || "",
          price: product.price,
          quantity: Number(line.quantity) || 1,
          stock: product.stock,
          active: product.active !== false,
          variant: line.variant,
          variantId: line.variantId
        };
      })
      .filter(Boolean);
  };

  const calculateCart = (items = []) => {
    const settings = getSettings();
    const subtotal = (Array.isArray(items) ? items : []).reduce(
      (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0),
      0
    );
    const freeLimit = Number(settings.freeShippingThreshold) || 0;
    const shippingFee = Number(settings.shippingFee) || 0;
    const shipping = subtotal === 0 || (freeLimit > 0 && subtotal >= freeLimit) ? 0 : shippingFee;
    return { subtotal, shipping, total: subtotal + shipping };
  };

  const requireOrderRepository = () => {
    if (!window.OrderRepository) throw new Error("Siparis servisi yuklenemedi.");
    return window.OrderRepository;
  };

  const getOrders = async () => requireOrderRepository().getOrders();

  const saveOrders = (orders) => write(KEYS.orders, orders);

  const getOrderById = async (orderId) => {
    const localOrder = read(KEYS.orders, []).find((order) => order.id === orderId || order.number === orderId);
    return localOrder || requireOrderRepository().getOrderById(orderId);
  };

  const createOrder = async ({ customer, note }) => {
    const cartItems = await getCartItems();
    if (!cartItems.length) throw new Error("Sepet bos.");

    cartItems.forEach((item) => ensureProductCanBePurchased(item, item.quantity));

    for (const item of cartItems) {
      const assignedColors = await getProductColors(item.productId);
      if (!assignedColors.length) continue;
      const selectedColor = assignedColors.find(
        (row) => row.color_code === item.variantId && row.color_master?.is_active === true
      );
      if (!selectedColor) {
        throw new Error(`${item.name} icin gecerli bir renk secmelisiniz.`);
      }
      item.variant =
        selectedColor.color_master?.name_tr ||
        selectedColor.color_master?.name_en ||
        selectedColor.color_code;
    }

    const totals = calculateCart(cartItems);
    const now = new Date();
    const order = {
      id: makeId("ord"),
      number: `MAde-${now.getFullYear()}-${String(Date.now()).slice(-8)}`,
      customer,
      items: cartItems.map((item) => ({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        colorCode: item.variantId || "",
        colorName: item.variant || ""
      })),
      subtotal: totals.subtotal,
      shipping: totals.shipping,
      total: totals.total,
      status: "new",
      paymentMethod: window.AppConfig?.get("PAYMENTS_ENABLED") ? "Ödeme yöntemi daha sonra seçilecek" : "Henüz ödeme alınmadı",
      paymentStatus: "pending",
      paymentProvider: "manual",
      transactionId: "",
      cargoCompany: "",
      trackingNumber: "",
      trackingUrl: "",
      shipmentStatus: "pending",
      note: note || "",
      createdAt: now.toISOString()
    };

    for (const item of cartItems) {
      try {
        await updateProductStock(item.productId, { delta: -item.quantity });
      } catch (error) {
        console.warn("Demo siparisi kaydedildi, ancak stok Supabase'de guncellenemedi:", {
          productId: item.productId,
          message: error.message
        });
      }
    }

    await requireOrderRepository().createOrder(order);
    saveOrders([order]);
    clearCart();
    await getProducts({ includeInactive: true });
    return order;
  };

  const updateOrderStatus = async (orderId, status) =>
    requireOrderRepository().updateOrder(orderId, { status });

  const updateOrderPayment = async (orderId, payment) =>
    requireOrderRepository().updateOrder(orderId, payment);

  const updateOrderShipping = async (orderId, shipping) =>
    requireOrderRepository().updateOrder(orderId, shipping);

  const resetDemo = () => {
    const data = seed();
    write(KEYS.settings, data.settings || {});
    write(KEYS.paymentSettings, data.paymentSettings || paymentDefaults);
    write(KEYS.shippingSettings, data.shippingSettings || shippingDefaults);
    write(KEYS.orders, data.orders || []);
    write(KEYS.cart, []);
  };

  const exportData = async () => ({
    settings: getSettings(),
    paymentSettings: getPaymentSettings(),
    shippingSettings: getShippingSettings(),
    categories: await getCategories({ includeInactive: true }),
    products: await getProducts({ includeInactive: true }),
    orders: await getOrders()
  });

  init();
  const ready = hydrateRemoteCatalog();

  window.Store = {
    init,
    getSettings,
    saveSettings,
    getDefaultPaymentSettings,
    getPaymentSettings,
    savePaymentSettings,
    getDefaultShippingSettings,
    getShippingSettings,
    saveShippingSettings,
    getCategories,
    getCachedCategories,
    getCategoryById,
    getCategoryBySlug,
    upsertCategory,
    deleteCategory,
    getProducts,
    getCachedProducts,
    upsertProduct,
    deleteProduct,
    updateProductStock,
    getProductImages,
    createProductImages,
    setPrimaryProductImage,
    updateProductImageOrder,
    deleteProductImage,
    getAllColors,
    getActiveColors,
    updateColorActiveStatus,
    getProductColors,
    replaceProductColors,
    getProductById,
    getProductBySlug,
    getProductBySku,
    getCart,
    setCart,
    addToCart,
    updateCartItem,
    editCartItem,
    removeFromCart,
    removeCartItem,
    clearCart,
    getCartItems,
    calculateCart,
    getOrders,
    getOrderById,
    createOrder,
    updateOrderStatus,
    updateOrderPayment,
    updateOrderShipping,
    resetDemo,
    exportData,
    ready,
    syncRemoteCatalog,
    slugify
  };
})();
