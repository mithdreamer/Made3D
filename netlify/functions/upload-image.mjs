import { getStore } from "@netlify/blobs";
import { randomUUID } from "node:crypto";

const STORE_NAME = "made3d-site-images";
const MAX_UPLOAD_BYTES = 2.5 * 1024 * 1024;
const DATA_URL_PATTERN = /^data:(image\/(?:jpeg|jpg|png|webp));base64,([a-z0-9+/=]+)$/i;

const jsonResponse = (body, init = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...(init.headers || {})
    }
  });

const extensionFor = (contentType) => {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
};

export default async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, { status: 405 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, { status: 400 });
  }

  const match = String(payload?.image || "").match(DATA_URL_PATTERN);
  if (!match) {
    return jsonResponse({ error: "Expected a valid image data URL." }, { status: 400 });
  }

  const contentType = match[1].toLowerCase().replace("image/jpg", "image/jpeg");
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.byteLength > MAX_UPLOAD_BYTES) {
    return jsonResponse({ error: "Image size is outside the supported range." }, { status: 413 });
  }

  const key = `${Date.now().toString(36)}-${randomUUID()}.${extensionFor(contentType)}`;
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const images = getStore(STORE_NAME);

  await images.set(key, arrayBuffer, {
    metadata: {
      contentType
    }
  });

  return jsonResponse({
    key,
    src: `/.netlify/functions/image?key=${encodeURIComponent(key)}`
  });
};
