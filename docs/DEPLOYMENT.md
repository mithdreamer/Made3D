# Made3D Deployment

This project is a static multi-page site. It must keep working on GitHub Pages, Netlify and a future custom domain without changing application code beyond runtime config and provider settings.

## Current Hosting Shape

- GitHub Pages workflow: `.github/workflows/deploy-pages.yml`
- Netlify config: `netlify.toml`, `publish = "."`
- Runtime config: `js/config.js`
- Media Worker root: `https://made3d-upload-service.korhanors.workers.dev`

No production deploy, DNS change or domain connection should be done without explicit owner approval.

## GitHub Pages

1. Keep the source as static HTML, CSS and JS.
2. Keep relative asset paths such as `../js/...` for pages under `pages/` and `admin/`.
3. Use GitHub Pages Actions deployment from `.github/workflows/deploy-pages.yml`.
4. If a custom domain is selected later, configure it in GitHub Pages settings and add the required DNS records.
5. Add the selected domain to Supabase Auth redirect URLs.
6. Add the selected origin to Cloudflare Worker `ALLOWED_ORIGINS`.
7. Update canonical URL metadata only after the production domain is chosen.

## Netlify

1. Keep `netlify.toml` publish directory as `.` unless the project gains a build step.
2. Do not use Netlify Functions for product image upload.
3. `netlify/functions/store.mjs` is optional shared settings storage. It is disabled unless `window.APP_CONFIG.REMOTE_STORE_URL` is set.
4. If a Netlify custom domain is selected, configure the domain and HTTPS in Netlify before changing canonical URLs.
5. Add the Netlify origin to Supabase Auth redirect URLs and Worker `ALLOWED_ORIGINS`.

## Custom Domain Checklist

Choose exactly one production hosting target for the custom domain. Do not point the same domain to GitHub Pages and Netlify production at the same time.

- Pick the canonical production origin.
- Decide apex, `www`, or both.
- Configure DNS:
  - Apex domain: provider-specific A/ALIAS/ANAME records.
  - `www`: CNAME to the chosen hosting target.
- Enable HTTPS and wait for certificate issuance.
- Set redirects between apex and `www` at the hosting provider.
- Add the final site origin to Supabase Auth redirect URLs.
- Add the final admin URLs to Supabase Auth redirect URLs if needed.
- Add localhost development origins and the final production origin to Worker `ALLOWED_ORIGINS`.
- Update `js/config.js` only if media, upload or remote store endpoints move.
- Update canonical URL tags only after the final domain is approved.

## Worker CORS Origins

Example development and production origins:

```text
http://localhost:8080
http://127.0.0.1:8080
https://mithdreamer.github.io
https://<approved-production-domain>
```

Do not use wildcard CORS. Do not include path segments such as `/Made3D/` or `/3-DStore`; CORS origins are scheme + host + optional port only.

## Supabase Auth Redirects

Add every deployed admin/login origin that will be used for sign-in:

```text
http://localhost:8080/admin/login.html
https://mithdreamer.github.io/Made3D/admin/login.html
https://<approved-production-domain>/admin/login.html
```

The exact custom domain must be chosen before adding production redirects.

## Manual Release Order

1. Review and run the Supabase migration in `supabase/migrations/20260729130000_product_images_metadata_rls.sql`.
2. Review the Worker source in `workers/made3d-upload-service/src/worker.js`.
3. Configure Worker vars and R2 binding from `workers/made3d-upload-service/wrangler.example.toml`.
4. Deploy the Worker only after approval.
5. Verify `GET /`, `OPTIONS /upload`, unauthorized `POST /upload`, authorized admin upload, and `GET /media/<objectKey>`.
6. Verify admin product image upload in a non-production environment.
7. Merge/publish the static site.
8. Configure any custom domain only after explicit approval.
