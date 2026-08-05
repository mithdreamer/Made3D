(function () {
  const getClient = () => {
    if (!window.supabaseClient) throw new Error("Supabase baglantisi bulunamadi.");
    return window.supabaseClient;
  };

  const toAppOrder = (row = {}) => ({
    id: row.id,
    number: row.order_number,
    customer: row.customer || {},
    items: row.items || [],
    subtotal: Number(row.subtotal) || 0,
    shipping: Number(row.shipping) || 0,
    total: Number(row.total) || 0,
    status: row.status || "new",
    paymentMethod: row.payment_method || "",
    paymentStatus: row.payment_status || "pending",
    paymentProvider: row.payment_provider || "manual",
    transactionId: row.transaction_id || "",
    cargoCompany: row.cargo_company || "",
    trackingNumber: row.tracking_number || "",
    trackingUrl: row.tracking_url || "",
    shipmentStatus: row.shipment_status || "pending",
    note: row.note || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  });

  const toRow = (order = {}) => ({
    id: order.id,
    order_number: order.number,
    customer: order.customer,
    items: order.items,
    subtotal: order.subtotal,
    shipping: order.shipping,
    total: order.total,
    status: order.status,
    payment_method: order.paymentMethod,
    payment_status: order.paymentStatus,
    payment_provider: order.paymentProvider,
    transaction_id: order.transactionId,
    cargo_company: order.cargoCompany,
    tracking_number: order.trackingNumber,
    tracking_url: order.trackingUrl,
    shipment_status: order.shipmentStatus,
    note: order.note
  });

  const getOrders = async () => {
    const { data, error } = await getClient().from("orders").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(`Siparisler alinamadi: ${error.message}`);
    return (data || []).map(toAppOrder);
  };

  const getOrderById = async (orderId) => {
    const { data, error } = await getClient().from("orders").select("*").eq("id", orderId).maybeSingle();
    if (error) throw new Error(`Siparis alinamadi: ${error.message}`);
    return data ? toAppOrder(data) : null;
  };

  const createOrder = async (order) => {
    const { error } = await getClient().from("orders").insert(toRow(order));
    if (error) throw new Error(`Siparis kaydedilemedi: ${error.message}`);
    return order;
  };

  const updateOrder = async (orderId, changes = {}) => {
    const map = {
      status: "status",
      paymentMethod: "payment_method",
      paymentStatus: "payment_status",
      paymentProvider: "payment_provider",
      transactionId: "transaction_id",
      cargoCompany: "cargo_company",
      trackingNumber: "tracking_number",
      trackingUrl: "tracking_url",
      shipmentStatus: "shipment_status"
    };
    const payload = {};
    Object.entries(map).forEach(([appKey, dbKey]) => {
      if (changes[appKey] !== undefined) payload[dbKey] = changes[appKey];
    });
    if (changes.shipmentStatus === "shipped" && changes.status === undefined) payload.status = "shipped";
    payload.updated_at = new Date().toISOString();

    const { error } = await getClient().from("orders").update(payload).eq("id", orderId);
    if (error) throw new Error(`Siparis guncellenemedi: ${error.message}`);
    return { id: orderId, ...changes };
  };

  window.OrderRepository = { getOrders, getOrderById, createOrder, updateOrder };
})();
