import { getStore } from "@netlify/blobs";

const STORE_NAME = "made3d-site-data";
const STATE_KEY = "catalog-state";
const ALLOWED_KEYS = ["settings", "categories", "products"];
const PRIVATE_SETTING_KEYS = new Set(["adminUsername", "adminPassword"]);

const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};

const jsonResponse = (body, init = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...jsonHeaders,
      ...(init.headers || {})
    }
  });

const publicSettings = (settings = {}) =>
  Object.entries(settings || {}).reduce((result, [key, value]) => {
    if (!PRIVATE_SETTING_KEYS.has(key)) result[key] = value;
    return result;
  }, {});

const pickAllowedState = (state = {}) =>
  ALLOWED_KEYS.reduce((result, key) => {
    if (!Object.prototype.hasOwnProperty.call(state, key)) return result;
    result[key] = key === "settings" ? publicSettings(state[key]) : state[key];
    return result;
  }, {});

export default async (request) => {
  const store = getStore(STORE_NAME);

  if (request.method === "GET") {
    const state = await store.get(STATE_KEY, { type: "json", consistency: "strong" });
    return jsonResponse(pickAllowedState(state || {}));
  }

  if (request.method === "PUT" || request.method === "POST") {
    let payload;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body." }, { status: 400 });
    }

    const nextState = pickAllowedState(payload);
    await store.setJSON(STATE_KEY, nextState);
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ error: "Method not allowed." }, { status: 405 });
};
