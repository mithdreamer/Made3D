(function () {
  const KEYS = {
    products: "MAde3D.products",
    categories: "MAde3D.categories",
    orders: "MAde3D.orders",
    settings: "MAde3D.settings",
    paymentSettings: "MAde3D.paymentSettings",
    shippingSettings: "MAde3D.shippingSettings",
    cart: "MAde3D.cart"
  };

  const seed = () => window.ECommerceSeed || {};
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const REMOTE_STORE_URL = "/.netlify/functions/store";
  const REMOTE_KEYS = new Set([KEYS.settings, KEYS.categories, KEYS.products]);
  let remoteAvailable = true;
  let remoteWriteTimer = null;
  let applyingRemoteState = false;

  const paymentDefaults = {
    enabled: true,
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
      name: "MAde3D Atölye",
      phone: "+90 555 123 45 67",
      address: "İstanbul, Türkiye"
    },
    carriers: [
      {
        id: "yurtici",
        name: "Yurtiçi",
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
        name: "Diğer",
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
      console.warn("Local veri okunamadı:", key, error);
      return clone(fallback);
    }
  };

  const writeLocal = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
    return value;
  };

  const remoteSupported = () =>
    typeof window.fetch === "function" && window.location.protocol !== "file:" && remoteAvailable;

  const publicSettings = (settings = {}) => {
    const { adminUsername, adminPassword, ...sharedSettings } = settings || {};
    return sharedSettings;
  };

  const catalogSnapshot = () => ({
    settings: publicSettings(read(KEYS.settings, seed().settings || {})),
    categories: read(KEYS.categories, seed().categories || []),
    products: read(KEYS.products, seed().products || [])
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
      console.info("Ortak katalog deposuna yazılamadı; yerel kayıt kullanılacak.", error);
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
    if (!localStorage.getItem(KEYS.paymentSettings)) writeLocal(KEYS.paymentSettings, data.paymentSettings || paymentDefaults);
    if (!localStorage.getItem(KEYS.shippingSettings)) writeLocal(KEYS.shippingSettings, data.shippingSettings || shippingDefaults);
    if (!localStorage.getItem(KEYS.categories)) writeLocal(KEYS.categories, data.categories || []);
    if (!localStorage.getItem(KEYS.products)) writeLocal(KEYS.products, data.products || []);
    if (!localStorage.getItem(KEYS.orders)) writeLocal(KEYS.orders, data.orders || []);
    if (!localStorage.getItem(KEYS.cart)) writeLocal(KEYS.cart, []);
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
      if (Array.isArray(data.categories)) writeLocal(KEYS.categories, data.categories);
      if (Array.isArray(data.products)) writeLocal(KEYS.products, data.products);
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
      console.info("Ortak katalog deposu okunamadı; yerel veri kullanılacak.", error);
    }
  };

  const getSettings = () => ({ ...(seed().settings || {}), ...read(KEYS.settings, seed().settings || {}) });
  const saveSettings = (settings) => write(KEYS.settings, { ...getSettings(), ...settings });
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

  const getCategories = (options = {}) => {
    const categories = read(KEYS.categories, seed().categories || []);
    return options.includeInactive ? categories : categories.filter((category) => category.active !== false);
  };

  const saveCategories = (categories) => write(KEYS.categories, categories);

  const upsertCategory = (category) => {
    const categories = getCategories({ includeInactive: true });
    const now = new Date().toISOString();
    const nextCategory = {
      id: category.id || makeId("cat"),
      name: category.name,
      slug: category.slug || slugify(category.name),
      description: category.description || "",
      active: category.active !== false,
      createdAt: category.createdAt || now,
      updatedAt: now
    };
    const index = categories.findIndex((item) => item.id === nextCategory.id);
    if (index >= 0) categories[index] = { ...categories[index], ...nextCategory };
    else categories.push(nextCategory);
    saveCategories(categories);
    return nextCategory;
  };

  const deleteCategory = (categoryId) => {
    const used = getProducts({ includeInactive: true }).some((product) => product.categoryId === categoryId);
    if (used) {
      throw new Error("Bu kategoriye bağlı ürünler var. Önce ürünlerin kategorisini değiştirin.");
    }
    saveCategories(getCategories({ includeInactive: true }).filter((category) => category.id !== categoryId));
  };

  const getProducts = (options = {}) => {
    const products = read(KEYS.products, seed().products || []);
    return options.includeInactive ? products : products.filter((product) => product.active !== false);
  };

  const saveProducts = (products) => write(KEYS.products, products);

  const upsertProduct = (product) => {
    const products = getProducts({ includeInactive: true });
    const now = new Date().toISOString();
    const nextProduct = {
      id: product.id || makeId("prd"),
      name: product.name,
      slug: product.slug || slugify(product.name),
      sku: product.sku || "",
      categoryId: product.categoryId || "",
      shortDescription: product.shortDescription || "",
      description: product.description || "",
      price: Number(product.price) || 0,
      oldPrice: Number(product.oldPrice) || 0,
      stock: Number(product.stock) || 0,
      active: product.active !== false,
      featured: Boolean(product.featured),
      images: Array.isArray(product.images) ? product.images.filter(Boolean) : [],
      createdAt: product.createdAt || now,
      updatedAt: now
    };
    const index = products.findIndex((item) => item.id === nextProduct.id);
    if (index >= 0) products[index] = { ...products[index], ...nextProduct };
    else products.push(nextProduct);
    saveProducts(products);
    return nextProduct;
  };

  const deleteProduct = (productId) => {
    saveProducts(getProducts({ includeInactive: true }).filter((product) => product.id !== productId));
    const cart = getCart().filter((line) => line.productId !== productId);
    setCart(cart);
  };

  const getProductById = (productId, options = {}) =>
    getProducts(options).find((product) => product.id === productId);

  const getProductBySlug = (slug, options = {}) =>
    getProducts(options).find((product) => product.slug === slug || product.id === slug);

  const getCart = () => read(KEYS.cart, []);
  const setCart = (cart) => write(KEYS.cart, cart);

  const addToCart = (productId, quantity = 1) => {
    const product = getProductById(productId);
    if (!product) throw new Error("Ürün bulunamadı.");
    const maxStock = Number.isFinite(Number(product.stock)) ? Number(product.stock) : 99;
    if (maxStock <= 0) throw new Error("Ürün stokta yok.");
    const cart = getCart();
    const line = cart.find((item) => item.productId === productId);
    const nextQuantity = Math.max(1, Number(quantity) || 1);
    if (line) line.quantity = Math.min(maxStock, line.quantity + nextQuantity);
    else cart.push({ productId, quantity: Math.min(maxStock, nextQuantity) });
    setCart(cart);
    return cart;
  };

  const updateCartItem = (productId, quantity) => {
    const nextQuantity = Number(quantity);
    if (nextQuantity <= 0) return removeCartItem(productId);
    const cart = getCart().map((line) =>
      line.productId === productId ? { ...line, quantity: nextQuantity } : line
    );
    return setCart(cart);
  };

  const removeCartItem = (productId) => setCart(getCart().filter((line) => line.productId !== productId));
  const clearCart = () => setCart([]);

  const getCartItems = () =>
    getCart()
      .map((line) => {
        const product = getProductById(line.productId);
        if (!product) return null;
        return {
          productId: product.id,
          name: product.name,
          slug: product.slug,
          image: product.images?.[0] || "",
          price: product.price,
          quantity: Number(line.quantity) || 1,
          stock: product.stock
        };
      })
      .filter(Boolean);

  const calculateCart = (items = getCartItems()) => {
    const settings = getSettings();
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const freeLimit = Number(settings.freeShippingThreshold) || 0;
    const shippingFee = Number(settings.shippingFee) || 0;
    const shipping = subtotal === 0 || (freeLimit > 0 && subtotal >= freeLimit) ? 0 : shippingFee;
    return { subtotal, shipping, total: subtotal + shipping };
  };

  const getOrders = () =>
    read(KEYS.orders, seed().orders || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const saveOrders = (orders) => write(KEYS.orders, orders);

  const getOrderById = (orderId) =>
    getOrders().find((order) => order.id === orderId || order.number === orderId);

  const createOrder = ({ customer, paymentMethod, note }) => {
    const cartItems = getCartItems();
    if (!cartItems.length) throw new Error("Sepet boş.");
    const totals = calculateCart(cartItems);
    const orders = getOrders();
    const paymentSettings = getPaymentSettings();
    const selectedPaymentMethod = paymentMethod || "Kapıda ödeme";
    const isCardPayment = selectedPaymentMethod.toLocaleLowerCase("tr-TR").includes("kredi kart");
    const now = new Date();
    const order = {
      id: makeId("ord"),
      number: `MAde-${now.getFullYear()}-${String(orders.length + 1).padStart(4, "0")}`,
      customer,
      items: cartItems.map((item) => ({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        price: item.price
      })),
      subtotal: totals.subtotal,
      shipping: totals.shipping,
      total: totals.total,
      status: "new",
      paymentMethod: selectedPaymentMethod,
      paymentStatus: isCardPayment ? "paid" : "pending",
      paymentProvider: isCardPayment ? paymentSettings.activeProvider : "manual",
      transactionId: "",
      cargoCompany: "",
      trackingNumber: "",
      trackingUrl: "",
      shipmentStatus: "pending",
      note: note || "",
      createdAt: now.toISOString()
    };

    saveOrders([order, ...orders]);
    const products = getProducts({ includeInactive: true }).map((product) => {
      const line = cartItems.find((item) => item.productId === product.id);
      if (!line) return product;
      return { ...product, stock: Math.max(0, Number(product.stock || 0) - line.quantity) };
    });
    saveProducts(products);
    clearCart();
    return order;
  };

  const updateOrderStatus = (orderId, status) => {
    const orders = getOrders().map((order) =>
      order.id === orderId ? { ...order, status, updatedAt: new Date().toISOString() } : order
    );
    saveOrders(orders);
    return getOrderById(orderId);
  };

  const updateOrderPayment = (orderId, payment) => {
    const orders = getOrders().map((order) =>
      order.id === orderId
        ? {
            ...order,
            paymentMethod: payment.paymentMethod ?? order.paymentMethod,
            paymentStatus: payment.paymentStatus ?? order.paymentStatus ?? "pending",
            paymentProvider: payment.paymentProvider ?? order.paymentProvider ?? "manual",
            transactionId: payment.transactionId ?? order.transactionId ?? "",
            updatedAt: new Date().toISOString()
          }
        : order
    );
    saveOrders(orders);
    return getOrderById(orderId);
  };

  const updateOrderShipping = (orderId, shipping) => {
    const orders = getOrders().map((order) =>
      order.id === orderId
        ? {
            ...order,
            cargoCompany: shipping.cargoCompany ?? order.cargoCompany ?? "",
            trackingNumber: shipping.trackingNumber ?? order.trackingNumber ?? "",
            trackingUrl: shipping.trackingUrl ?? order.trackingUrl ?? "",
            shipmentStatus: shipping.shipmentStatus ?? order.shipmentStatus ?? "pending",
            status: shipping.shipmentStatus === "shipped" ? "shipped" : order.status,
            updatedAt: new Date().toISOString()
          }
        : order
    );
    saveOrders(orders);
    return getOrderById(orderId);
  };

  const resetDemo = () => {
    const data = seed();
    write(KEYS.settings, data.settings || {});
    write(KEYS.paymentSettings, data.paymentSettings || paymentDefaults);
    write(KEYS.shippingSettings, data.shippingSettings || shippingDefaults);
    write(KEYS.categories, data.categories || []);
    write(KEYS.products, data.products || []);
    write(KEYS.orders, data.orders || []);
    write(KEYS.cart, []);
  };

  const exportData = () => ({
    settings: getSettings(),
    paymentSettings: getPaymentSettings(),
    shippingSettings: getShippingSettings(),
    categories: getCategories({ includeInactive: true }),
    products: getProducts({ includeInactive: true }),
    orders: getOrders()
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
    upsertCategory,
    deleteCategory,
    getProducts,
    upsertProduct,
    deleteProduct,
    getProductById,
    getProductBySlug,
    getCart,
    setCart,
    addToCart,
    updateCartItem,
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
