import { getStore } from "@netlify/blobs";

const STORE_NAME = "made3d-site-images";
const SAFE_KEY_PATTERN = /^[a-z0-9._-]+$/i;

export default async (request) => {
  const url = new URL(request.url);
  const key = url.searchParams.get("key") || "";

  if (!SAFE_KEY_PATTERN.test(key)) {
    return new Response("Invalid image key.", { status: 400 });
  }

  const images = getStore(STORE_NAME);
  const entry = await images.getWithMetadata(key, { type: "arrayBuffer", consistency: "strong" });

  if (!entry?.data) {
    return new Response("Image not found.", { status: 404 });
  }

  return new Response(entry.data, {
    headers: {
      "Content-Type": entry.metadata?.contentType || "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable"
    }
  });
};
