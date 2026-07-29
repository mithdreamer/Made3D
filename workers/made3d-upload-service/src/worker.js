const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS_BY_TYPE = {
  "image/jpeg": new Set(["jpg", "jpeg"]),
  "image/png": new Set(["png"]),
  "image/webp": new Set(["webp"]),
  "image/avif": new Set(["avif"])
};
const PRODUCT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OBJECT_ID_PATTERN =
  "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const MEDIA_KEY_PATTERN = new RegExp(
  `^products/(?:${OBJECT_ID_PATTERN}/)?${OBJECT_ID_PATTERN}\\.(?:jpg|jpeg|png|webp|avif)$`,
  "i"
);

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "Cache-Control": "no-store",
      ...headers
    }
  });

const getAllowedOrigins = (env) =>
  String(env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const corsHeaders = (request, env) => {
  const origin = request.headers.get("Origin") || "";
  const allowed = getAllowedOrigins(env);
  if (!origin || !allowed.includes(origin)) return {};

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Authorization,Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin"
  };
};

const isAllowedOrigin = (request, env, options = {}) => {
  const origin = request.headers.get("Origin");
  if (!origin) return options.required !== true;
  return getAllowedOrigins(env).includes(origin);
};

const extensionFor = (contentType) => {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/avif") return "avif";
  return "jpg";
};

const hasAllowedExtension = (fileName, contentType) => {
  const extension = String(fileName || "").toLowerCase().split(".").pop();
  return Boolean(extension && ALLOWED_EXTENSIONS_BY_TYPE[contentType]?.has(extension));
};

const safeObjectKey = (key) =>
  /^[a-zA-Z0-9/_\-.]+$/.test(key) &&
  key.startsWith("products/") &&
  MEDIA_KEY_PATTERN.test(key) &&
  !key.includes("..") &&
  !key.includes("//") &&
  !key.startsWith("/") &&
  !key.endsWith("/");

const productIdFromKey = (key) => {
  const parts = String(key || "").split("/");
  return parts.length === 3 && PRODUCT_ID_PATTERN.test(parts[1]) ? parts[1] : "";
};

const mediaKeyFromPath = (pathname) => {
  const prefix = "/media/";
  if (!pathname.startsWith(prefix)) return "";
  try {
    return decodeURIComponent(pathname.slice(prefix.length));
  } catch {
    return "";
  }
};

const requireAdmin = async (request, env) => {
  const authorization = request.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) {
    return { error: json({ success: false, error: "Unauthorized" }, 401, corsHeaders(request, env)) };
  }

  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return { error: json({ success: false, error: "Worker auth is not configured" }, 500, corsHeaders(request, env)) };
  }

  const response = await fetch(`${env.SUPABASE_URL.replace(/\/+$/, "")}/auth/v1/user`, {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: authorization
    }
  });

  if (!response.ok) {
    return { error: json({ success: false, error: "Unauthorized" }, 401, corsHeaders(request, env)) };
  }

  const user = await response.json();
  if (user?.app_metadata?.role !== "admin") {
    return { error: json({ success: false, error: "Forbidden" }, 403, corsHeaders(request, env)) };
  }

  return { user };
};

const handleUpload = async (request, env) => {
  const headers = corsHeaders(request, env);
  if (!isAllowedOrigin(request, env, { required: true })) {
    return json({ success: false, error: "Origin is not allowed" }, 403, headers);
  }

  if (!env.MEDIA_BUCKET?.put) {
    return json({ success: false, error: "Media bucket is not configured" }, 500, headers);
  }

  const auth = await requireAdmin(request, env);
  if (auth.error) return auth.error;

  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return json({ success: false, error: "Expected multipart/form-data" }, 400, headers);
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const productId = String(formData.get("productId") || "").trim();

  if (!(file instanceof File)) {
    return json({ success: false, error: "Missing file field" }, 400, headers);
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return json({ success: false, error: "Unsupported image type" }, 415, headers);
  }

  if (!hasAllowedExtension(file.name, file.type)) {
    return json({ success: false, error: "Unsupported image extension" }, 415, headers);
  }

  if (!file.size || file.size > MAX_IMAGE_BYTES) {
    return json({ success: false, error: "Image size is outside the supported range" }, 413, headers);
  }

  if (!PRODUCT_ID_PATTERN.test(productId)) {
    return json({ success: false, error: "Invalid product id" }, 400, headers);
  }

  const objectKey = `products/${productId}/${crypto.randomUUID()}.${extensionFor(file.type)}`;
  try {
    await env.MEDIA_BUCKET.put(objectKey, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: file.type
      },
      customMetadata: {
        productId,
        originalName: file.name || "",
        uploadedBy: auth.user.id || ""
      }
    });
  } catch (error) {
    console.error("R2 upload failed:", { message: error?.message });
    return json({ success: false, error: "Image could not be stored" }, 502, headers);
  }

  return json(
    {
      success: true,
      objectKey,
      object_key: objectKey,
      bucket: env.MEDIA_BUCKET_NAME || "made3d-media",
      contentType: file.type,
      mimeType: file.type,
      sizeBytes: file.size,
      originalName: file.name || ""
    },
    200,
    headers
  );
};

const handleMedia = async (request, env, key) => {
  if (!safeObjectKey(key)) {
    return json({ success: false, error: "Invalid media key" }, 400, corsHeaders(request, env));
  }

  const object = await env.MEDIA_BUCKET.get(key);
  if (!object) {
    return json({ success: false, error: "Not found" }, 404, corsHeaders(request, env));
  }

  return new Response(object.body, {
    headers: {
      ...corsHeaders(request, env),
      "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      ETag: object.httpEtag
    }
  });
};

const handleDelete = async (request, env, key) => {
  const headers = corsHeaders(request, env);
  if (!isAllowedOrigin(request, env, { required: true })) {
    return json({ success: false, error: "Origin is not allowed" }, 403, headers);
  }

  if (!env.MEDIA_BUCKET?.delete) {
    return json({ success: false, error: "Media bucket is not configured" }, 500, headers);
  }

  const auth = await requireAdmin(request, env);
  if (auth.error) return auth.error;

  if (!safeObjectKey(key)) {
    return json({ success: false, error: "Invalid media key" }, 400, headers);
  }

  const scopedProductId = productIdFromKey(key);
  try {
    if (scopedProductId) {
      const object = await env.MEDIA_BUCKET.get(key);
      const objectProductId = object?.customMetadata?.productId || "";
      if (objectProductId && objectProductId !== scopedProductId) {
        return json({ success: false, error: "Media key does not match stored product metadata" }, 403, headers);
      }
    }

    await env.MEDIA_BUCKET.delete(key);
  } catch (error) {
    console.error("R2 delete failed:", { message: error?.message });
    return json({ success: false, error: "Image could not be deleted" }, 502, headers);
  }

  return json({ success: true, objectKey: key }, 200, headers);
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const headers = corsHeaders(request, env);

    if (request.method === "OPTIONS") {
      return isAllowedOrigin(request, env, { required: true })
        ? new Response(null, { status: 204, headers })
        : json({ success: false, error: "Origin is not allowed" }, 403, headers);
    }

    if (url.pathname === "/") {
      return json({ success: true, service: "made3d-upload-service", status: "ready" }, 200, headers);
    }

    if (url.pathname === "/upload" && request.method === "POST") {
      return handleUpload(request, env);
    }

    const mediaKey = mediaKeyFromPath(url.pathname);
    if (mediaKey && request.method === "GET") {
      return handleMedia(request, env, mediaKey);
    }

    if (mediaKey && request.method === "DELETE") {
      return handleDelete(request, env, mediaKey);
    }

    return json({ success: false, error: "Not found" }, 404, headers);
  }
};
