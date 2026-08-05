(function () {
  const WORKER_BASE_URL = "https://made3d-upload-service.korhanors.workers.dev";

  const normalizeDirectoryUrl = (value) => {
    const url = String(value || "").trim();
    if (!url) return "";
    return url.endsWith("/") ? url : `${url}/`;
  };

  const normalizeEndpointUrl = (value) => String(value || "").trim().replace(/\/+$/, "");

  const defaults = {
    SUPABASE_URL: "https://zkrqlmdouceszgnkxnzh.supabase.co",
    SUPABASE_ANON_KEY: "sb_publishable_U_MDve3jJvI7SUknt0czYw_bq-qa5ti",
    MEDIA_BASE_URL: `${WORKER_BASE_URL}/media/`,
    UPLOAD_URL: `${WORKER_BASE_URL}/upload`,
    MEDIA_BUCKET_NAME: "made3d-media",
    MEDIA_STORAGE_PROVIDER: "cloudflare_r2",
    REMOTE_STORE_URL: "",
    PAYMENTS_ENABLED: false,
    MAX_PRODUCT_IMAGES: 6,
    MAX_IMAGE_BYTES: 10 * 1024 * 1024,
    ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp", "image/avif"]
  };

  const config = {
    ...defaults,
    ...(window.APP_CONFIG || {})
  };

  config.MEDIA_BASE_URL = normalizeDirectoryUrl(config.MEDIA_BASE_URL);
  config.UPLOAD_URL = normalizeEndpointUrl(config.UPLOAD_URL);

  const mediaUrl = (objectKey) => {
    const key = String(objectKey || "").trim();
    if (!key) return "";
    if (/^(data:|blob:|https?:|\/)/i.test(key)) return key;
    return `${config.MEDIA_BASE_URL}${key.replace(/^\/+/, "")}`;
  };

  window.APP_CONFIG = Object.freeze(config);
  window.AppConfig = Object.freeze({
    get: (key) => window.APP_CONFIG?.[key],
    mediaUrl
  });
})();
