# Made3D Image Upload Architecture

## Data Flow

1. Admin signs in with Supabase Auth. The user must have `app_metadata.role = "admin"`.
2. The product form saves the product with `Store.upsertProduct()`.
3. The returned `product.id` is sent with each selected image to `window.APP_CONFIG.UPLOAD_URL`.
4. The upload request uses `multipart/form-data`:
   - `file`: the real image file
   - `productId`: the saved Supabase product id
   - `Authorization: Bearer <Supabase admin access token>`
5. The Cloudflare Worker validates CORS, the Supabase session, admin role, MIME type, extension and size.
6. The Worker writes the file to Cloudflare R2 under a product-scoped UUID key: `products/<productId>/<uuid>.<ext>`.
7. The Worker returns normalized upload metadata such as `objectKey`, `sizeBytes`, `contentType` and `originalName`.
8. `ProductImageRepository.createProductImages()` writes metadata to Supabase `product_images`.
9. `ProductImageRepository.setPrimaryImage()` keeps one primary image per product.
10. Storefront product cards read the primary image from `storefront_products.primary_image_object_key`.
11. Product detail pages read the full gallery from `product_images`, sorted by `sort_order`.

## Frontend Contract

Runtime config lives in `js/config.js`:

```js
window.APP_CONFIG = {
  SUPABASE_URL: "...",
  SUPABASE_ANON_KEY: "...",
  MEDIA_BASE_URL: "https://made3d-upload-service.korhanors.workers.dev/media/",
  UPLOAD_URL: "https://made3d-upload-service.korhanors.workers.dev/upload"
};
```

Do not put Supabase service-role keys, Cloudflare API tokens, R2 access keys or upload secrets in this file.

`admin-js/image-upload.js` accepts Worker responses with these equivalent field names and normalizes them centrally:

- `objectKey`, `object_key`, `key` or `path`
- `sizeBytes`, `size_bytes`, `size` or `bytes`
- `contentType`, `content_type`, `mimeType` or `mime_type`
- `originalName`, `original_name`, `originalFileName` or `original_file_name`

The expected first-class response is:

```json
{
  "success": true,
  "objectKey": "products/<productId>/<uuid>.jpg",
  "bucket": "made3d-media",
  "contentType": "image/jpeg",
  "sizeBytes": 123456,
  "originalName": "photo.jpg"
}
```

## Supabase Mapping

The current `product_images` table uses:

- `product_id`
- `storage_provider`
- `bucket_name`
- `object_key`
- `public_url`
- `original_file_name`
- `mime_type`
- `size_bytes`
- `alt_text`
- `sort_order`
- `is_primary`

Run `supabase/migrations/20260729130000_product_images_metadata_rls.sql` before relying on admin writes in production.

## Error Handling

- If product save fails, image upload does not start.
- If product save succeeds but one or more uploads fail, the product remains saved and the admin sees a partial-success message.
- Failed pending files remain in the form and can be retried by saving again.
- If R2 upload succeeds but Supabase metadata write fails, the UI reports the image metadata failure and calls `DELETE /media/<encoded objectKey>` to clean up the orphaned R2 object.
- If an admin deletes a saved product image, the UI deletes the R2 object through the Worker before deleting the Supabase `product_images` row. Failed steps are reported and can be retried.
- Product cards and galleries use the local placeholder if an image URL is missing or broken.

## Security Boundaries

- The browser only uses the Supabase anon/publishable key.
- The browser sends the current Supabase session token to the Worker.
- The Worker verifies the token with Supabase Auth and checks `app_metadata.role = "admin"`.
- R2 credentials stay inside Cloudflare bindings.
- CORS origins are explicit. Do not use `*`.
- Accepted image types/extensions are JPEG/JPG, PNG, WebP and AVIF.
- Maximum image size is 10 MB.
- Object keys are generated with UUIDs under the saved product id and do not trust user filenames.
- User filenames are treated as metadata and escaped before display.
