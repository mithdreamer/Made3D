const { test, expect } = require("@playwright/test");
const fs = require("fs/promises");
const path = require("path");

const repoPath = (...segments) => path.join(process.cwd(), ...segments);
const PRODUCT_ID = "11111111-1111-4111-8111-111111111111";
const KEY_OK = `${PRODUCT_ID}/22222222-2222-4222-8222-222222222222`;
const KEY_FAIL = `${PRODUCT_ID}/33333333-3333-4333-8333-333333333333`;
const KEY_EXISTING = `${PRODUCT_ID}/44444444-4444-4444-8444-444444444444`;
const KEY_A = `${PRODUCT_ID}/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa`;
const KEY_B = `${PRODUCT_ID}/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb`;

const loadWorker = async () => {
  const source = await fs.readFile(repoPath("workers/made3d-upload-service/src/worker.js"), "utf8");
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
  return (await import(moduleUrl)).default;
};

const withMockedFetch = async (mockFetch, callback) => {
  const originalFetch = global.fetch;
  global.fetch = mockFetch;
  try {
    return await callback();
  } finally {
    global.fetch = originalFetch;
  }
};

const makeWorkerEnv = () => {
  const state = {
    puts: [],
    deletes: [],
    objects: new Map()
  };

  return {
    state,
    env: {
      ALLOWED_ORIGINS: "http://localhost:8080,https://mithdreamer.github.io",
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_ANON_KEY: "anon-key",
      MEDIA_BUCKET_NAME: "made3d-media",
      MEDIA_BUCKET: {
        put: async (key, body, options) => {
          state.puts.push({ key, body, options });
          state.objects.set(key, {
            body,
            httpMetadata: options?.httpMetadata || {},
            customMetadata: options?.customMetadata || {},
            httpEtag: "etag-test"
          });
        },
        get: async (key) => state.objects.get(key) || null,
        delete: async (key) => {
          state.deletes.push(key);
          state.objects.delete(key);
        }
      }
    }
  };
};

const mockSupabaseUser = (role = "admin") => async () =>
  new Response(JSON.stringify({ id: "user-1", app_metadata: { role } }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });

const imageForm = (file, productId = PRODUCT_ID) => {
  const form = new FormData();
  form.append("file", file, file.name);
  form.append("productId", productId);
  return form;
};

test("worker rejects disallowed upload origins before touching auth or R2", async () => {
  const worker = await loadWorker();
  const { env, state } = makeWorkerEnv();

  await withMockedFetch(async () => {
    throw new Error("Auth should not be called for a disallowed origin.");
  }, async () => {
    const response = await worker.fetch(
      new Request("https://worker.example/upload", {
        method: "POST",
        headers: {
          Origin: "https://evil.example",
          Authorization: "Bearer token"
        },
        body: imageForm(new File(["ok"], "photo.jpg", { type: "image/jpeg" }))
      }),
      env
    );

    expect(response.status).toBe(403);
    expect(state.puts).toHaveLength(0);
  });
});

test("worker rejects path-based GitHub Pages origins", async () => {
  const worker = await loadWorker();
  const { env, state } = makeWorkerEnv();

  await withMockedFetch(async () => {
    throw new Error("Auth should not be called for a path-based origin.");
  }, async () => {
    const response = await worker.fetch(
      new Request("https://worker.example/upload", {
        method: "POST",
        headers: {
          Origin: "https://mithdreamer.github.io/Made3D/",
          Authorization: "Bearer token"
        },
        body: imageForm(new File(["ok"], "photo.jpg", { type: "image/jpeg" }))
      }),
      env
    );

    expect(response.status).toBe(403);
    expect(state.puts).toHaveLength(0);
  });
});

test("worker rejects mutating requests without an Origin header", async () => {
  const worker = await loadWorker();
  const { env, state } = makeWorkerEnv();

  await withMockedFetch(async () => {
    throw new Error("Auth should not be called without Origin.");
  }, async () => {
    const response = await worker.fetch(
      new Request("https://worker.example/upload", {
        method: "POST",
        headers: {
          Authorization: "Bearer token"
        },
        body: imageForm(new File(["ok"], "photo.jpg", { type: "image/jpeg" }))
      }),
      env
    );

    expect(response.status).toBe(403);
    expect(state.puts).toHaveLength(0);
  });
});

test("worker blocks unauthorized upload and delete requests", async () => {
  const worker = await loadWorker();
  const { env, state } = makeWorkerEnv();

  await withMockedFetch(async () => new Response("{}", { status: 401 }), async () => {
    const uploadResponse = await worker.fetch(
      new Request("https://worker.example/upload", {
        method: "POST",
        headers: {
          Origin: "https://mithdreamer.github.io",
          Authorization: "Bearer bad-token"
        },
        body: imageForm(new File(["ok"], "photo.jpg", { type: "image/jpeg" }))
      }),
      env
    );

    const deleteResponse = await worker.fetch(
      new Request("https://worker.example/media/products%2Fphoto.jpg", {
        method: "DELETE",
        headers: {
          Origin: "https://mithdreamer.github.io",
          Authorization: "Bearer bad-token"
        }
      }),
      env
    );

    expect(uploadResponse.status).toBe(401);
    expect(deleteResponse.status).toBe(401);
    expect(state.puts).toHaveLength(0);
    expect(state.deletes).toHaveLength(0);
  });
});

test("worker validates image type, extension, size and product id", async () => {
  const worker = await loadWorker();
  const { env, state } = makeWorkerEnv();

  await withMockedFetch(mockSupabaseUser("admin"), async () => {
    const headers = {
      Origin: "https://mithdreamer.github.io",
      Authorization: "Bearer token"
    };

    const badType = await worker.fetch(
      new Request("https://worker.example/upload", {
        method: "POST",
        headers,
        body: imageForm(new File(["bad"], "photo.png", { type: "text/plain" }))
      }),
      env
    );

    const badExtension = await worker.fetch(
      new Request("https://worker.example/upload", {
        method: "POST",
        headers,
        body: imageForm(new File(["bad"], "photo.txt", { type: "image/png" }))
      }),
      env
    );

    const tooLarge = await worker.fetch(
      new Request("https://worker.example/upload", {
        method: "POST",
        headers,
        body: imageForm(new File([new Uint8Array(10 * 1024 * 1024 + 1)], "photo.jpg", { type: "image/jpeg" }))
      }),
      env
    );

    const badProduct = await worker.fetch(
      new Request("https://worker.example/upload", {
        method: "POST",
        headers,
        body: imageForm(new File(["ok"], "photo.jpg", { type: "image/jpeg" }), "not-a-uuid")
      }),
      env
    );

    expect(badType.status).toBe(415);
    expect(badExtension.status).toBe(415);
    expect(tooLarge.status).toBe(413);
    expect(badProduct.status).toBe(400);
    expect(state.puts).toHaveLength(0);
  });
});

test("worker uploads metadata and deletes only safe encoded product media keys", async () => {
  const worker = await loadWorker();
  const { env, state } = makeWorkerEnv();

  await withMockedFetch(mockSupabaseUser("admin"), async () => {
    const headers = {
      Origin: "https://mithdreamer.github.io",
      Authorization: "Bearer token"
    };

    const uploadResponse = await worker.fetch(
      new Request("https://worker.example/upload", {
        method: "POST",
        headers,
        body: imageForm(new File(["image-bytes"], "photo.webp", { type: "image/webp" }))
      }),
      env
    );
    const uploadJson = await uploadResponse.json();

    expect(uploadResponse.status).toBe(200);
    expect(uploadJson.objectKey).toMatch(new RegExp(`^products/${PRODUCT_ID}/.+\\.webp$`));
    expect(uploadJson.contentType).toBe("image/webp");
    expect(uploadJson.sizeBytes).toBe(11);
    expect(state.puts[0].key).toBe(uploadJson.objectKey);

    const deleteResponse = await worker.fetch(
      new Request(`https://worker.example/media/${encodeURIComponent(uploadJson.objectKey)}`, {
        method: "DELETE",
        headers
      }),
      env
    );

    const traversalResponse = await worker.fetch(
      new Request(`https://worker.example/media/${encodeURIComponent("../secret.txt")}`, {
        method: "DELETE",
        headers
      }),
      env
    );

    expect(deleteResponse.status).toBe(200);
    expect(traversalResponse.status).toBe(400);
    expect(state.deletes).toEqual([uploadJson.objectKey]);
  });
});

test("worker blocks scoped deletes when R2 product metadata disagrees with the key", async () => {
  const worker = await loadWorker();
  const { env, state } = makeWorkerEnv();
  const key = `products/${PRODUCT_ID}/55555555-5555-4555-8555-555555555555.jpg`;
  state.objects.set(key, {
    body: new Uint8Array([1]),
    httpMetadata: { contentType: "image/jpeg" },
    customMetadata: { productId: "66666666-6666-4666-8666-666666666666" },
    httpEtag: "etag-test"
  });

  await withMockedFetch(mockSupabaseUser("admin"), async () => {
    const response = await worker.fetch(
      new Request(`https://worker.example/media/${encodeURIComponent(key)}`, {
        method: "DELETE",
        headers: {
          Origin: "https://mithdreamer.github.io",
          Authorization: "Bearer token"
        }
      }),
      env
    );

    expect(response.status).toBe(403);
    expect(state.deletes).toEqual([]);
  });
});

const installRepositoryHarness = async (page) => {
  await page.goto("about:blank");
  await page.evaluate((keys) => {
    Object.assign(window, keys);
    window.APP_CONFIG = {
      MEDIA_BASE_URL: "https://worker.example/media/",
      MEDIA_STORAGE_PROVIDER: "cloudflare_r2",
      MEDIA_BUCKET_NAME: "made3d-media"
    };
    window.AppConfig = {
      mediaUrl: (objectKey) => `https://worker.example/media/${objectKey}`
    };
    window.__db = { product_images: [] };
    window.__insertFailures = {};
    window.__deletedRemote = [];
    window.__deletedRemoteUrls = [];
    window.AdminAuth = {
      requireAdminSession: async () => ({ access_token: "token" })
    };

    const applyFilters = (rows, filters) =>
      rows.filter((row) =>
        filters.every((filter) =>
          filter.type === "eq" ? row[filter.column] === filter.value : row[filter.column] !== filter.value
        )
      );

    class Query {
      constructor(table) {
        this.table = table;
        this.filters = [];
        this.orders = [];
        this.operation = "select";
        this.payload = null;
        this.singleMode = false;
        this.maybeMode = false;
      }

      select() {
        return this;
      }

      eq(column, value) {
        this.filters.push({ type: "eq", column, value });
        return this;
      }

      neq(column, value) {
        this.filters.push({ type: "neq", column, value });
        return this;
      }

      order(column, options = {}) {
        this.orders.push({ column, ascending: options.ascending !== false });
        return this;
      }

      insert(payload) {
        this.operation = "insert";
        this.payload = payload;
        return this;
      }

      update(payload) {
        this.operation = "update";
        this.payload = payload;
        return this;
      }

      delete() {
        this.operation = "delete";
        return this;
      }

      single() {
        this.singleMode = true;
        return this.execute();
      }

      maybeSingle() {
        this.singleMode = true;
        this.maybeMode = true;
        return this.execute();
      }

      then(resolve, reject) {
        return this.execute().then(resolve, reject);
      }

      matchingRows() {
        let rows = applyFilters(window.__db[this.table] || [], this.filters);
        for (const order of [...this.orders].reverse()) {
          rows = [...rows].sort((a, b) => {
            const left = a[order.column] ?? "";
            const right = b[order.column] ?? "";
            const compare = typeof left === "number" && typeof right === "number"
              ? left - right
              : String(left).localeCompare(String(right));
            return order.ascending ? compare : -compare;
          });
        }
        return rows;
      }

      async execute() {
        const table = window.__db[this.table] || [];

        if (this.operation === "insert") {
          const payload = Array.isArray(this.payload) ? this.payload[0] : this.payload;
          if (window.__insertFailures[payload.object_key]) {
            return {
              data: null,
              error: { code: window.__insertFailures[payload.object_key], message: "insert failed" }
            };
          }
          if (table.some((row) => row.object_key === payload.object_key)) {
            return { data: null, error: { code: "23505", message: "duplicate object_key" } };
          }
          const row = {
            id: `img-${table.length + 1}`,
            created_at: `2026-07-29T12:00:0${table.length}Z`,
            updated_at: `2026-07-29T12:00:0${table.length}Z`,
            ...payload
          };
          table.push(row);
          return { data: row, error: null };
        }

        if (this.operation === "update") {
          const rows = this.matchingRows();
          rows.forEach((row) => Object.assign(row, this.payload));
          return { data: this.singleMode ? rows[0] || null : rows, error: null };
        }

        if (this.operation === "delete") {
          const rows = this.matchingRows();
          rows.forEach((row) => {
            const index = table.indexOf(row);
            if (index >= 0) table.splice(index, 1);
          });
          return { data: this.singleMode ? rows[0] || null : rows, error: null };
        }

        const rows = this.matchingRows();
        if (!this.singleMode) return { data: rows, error: null };
        if (rows[0]) return { data: rows[0], error: null };
        return this.maybeMode
          ? { data: null, error: null }
          : { data: null, error: { code: "PGRST116", message: "not found" } };
      }
    }

    window.supabaseClient = {
      auth: {
        getSession: async () => ({ data: { session: { access_token: "token" } }, error: null })
      },
      from: (table) => new Query(table)
    };

    window.fetch = async (url, options = {}) => {
      if (options.method !== "DELETE") {
        throw new Error(`Unexpected fetch ${options.method || "GET"} ${url}`);
      }
      const parsed = new URL(url);
      const key = decodeURIComponent(parsed.pathname.replace(/^\/media\//, ""));
      window.__deletedRemoteUrls.push(url);
      window.__deletedRemote.push(key);
      return new Response(JSON.stringify({ success: true, objectKey: key }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    };
  }, { PRODUCT_ID, KEY_OK, KEY_FAIL, KEY_EXISTING, KEY_A, KEY_B });

  await page.addScriptTag({ path: repoPath("js/repositories/productImageRepository.js") });
};

test("repository rolls back only images whose Supabase metadata insert fails", async ({ page }) => {
  await installRepositoryHarness(page);

  const result = await page.evaluate(async () => {
    window.__insertFailures[`products/${KEY_FAIL}.jpg`] = "TEST_FAILURE";
    try {
      await window.ProductImageRepository.createProductImages("product-1", [
        {
          clientId: "ok",
          objectKey: `products/${KEY_OK}.jpg`,
          originalName: "ok.jpg",
          contentType: "image/jpeg",
          sizeBytes: 10,
          sortOrder: 0,
          altText: "Ok alt",
          isPrimary: true
        },
        {
          clientId: "fail",
          objectKey: `products/${KEY_FAIL}.jpg`,
          originalName: "fail.jpg",
          contentType: "image/jpeg",
          sizeBytes: 20,
          sortOrder: 1
        }
      ]);
    } catch (error) {
      return {
        message: error.message,
        created: error.createdImages.map((image) => image.objectKey),
        failed: error.failedImages.map((image) => image.objectKey),
        rows: window.__db.product_images.map((image) => ({
          object_key: image.object_key,
          original_file_name: image.original_file_name,
          mime_type: image.mime_type,
          size_bytes: image.size_bytes,
          sort_order: image.sort_order,
          alt_text: image.alt_text,
          is_primary: image.is_primary
        })),
        deletedRemote: window.__deletedRemote,
        deletedUrls: window.__deletedRemoteUrls
      };
    }
    return null;
  });

  expect(result.message).toContain("Bazi gorsel kayitlari olusturulamadi");
  expect(result.created).toEqual([`products/${KEY_OK}.jpg`]);
  expect(result.failed).toEqual([`products/${KEY_FAIL}.jpg`]);
  expect(result.rows).toEqual([
    {
      object_key: `products/${KEY_OK}.jpg`,
      original_file_name: "ok.jpg",
      mime_type: "image/jpeg",
      size_bytes: 10,
      sort_order: 0,
      alt_text: "Ok alt",
      is_primary: true
    }
  ]);
  expect(result.deletedRemote).toEqual([`products/${KEY_FAIL}.jpg`]);
  expect(result.deletedUrls[0]).toContain(encodeURIComponent(`products/${KEY_FAIL}.jpg`));
});

test("repository does not delete R2 when retry sees an existing object_key row", async ({ page }) => {
  await installRepositoryHarness(page);

  const result = await page.evaluate(async () => {
    window.__db.product_images.push({
      id: "img-existing",
      product_id: "product-1",
      object_key: `products/${KEY_EXISTING}.jpg`,
      sort_order: 0,
      is_primary: true,
      created_at: "2026-07-29T12:00:00Z"
    });

    const images = await window.ProductImageRepository.createProductImages("product-1", [
      {
        clientId: "retry",
        objectKey: `products/${KEY_EXISTING}.jpg`,
        originalName: "existing.jpg",
        contentType: "image/jpeg",
        sizeBytes: 20,
        sortOrder: 0
      }
    ]);

    return {
      images: images.map((image) => image.id),
      rows: window.__db.product_images.map((image) => image.id),
      deletedRemote: window.__deletedRemote
    };
  });

  expect(result.images).toEqual(["img-existing"]);
  expect(result.rows).toEqual(["img-existing"]);
  expect(result.deletedRemote).toEqual([]);
});

test("repository deletes R2 and promotes the next image when deleting a primary image", async ({ page }) => {
  await installRepositoryHarness(page);

  const result = await page.evaluate(async () => {
    window.__db.product_images.push(
      {
        id: "img-a",
        product_id: "product-1",
        object_key: `products/${KEY_A}.jpg`,
        sort_order: 0,
        is_primary: true,
        created_at: "2026-07-29T12:00:00Z"
      },
      {
        id: "img-b",
        product_id: "product-1",
        object_key: `products/${KEY_B}.jpg`,
        sort_order: 1,
        is_primary: false,
        created_at: "2026-07-29T12:00:01Z"
      }
    );

    const deleted = await window.ProductImageRepository.deleteProductImage("img-a");
    return {
      deleted,
      rows: window.__db.product_images.map((image) => ({
        id: image.id,
        is_primary: image.is_primary
      })),
      deletedRemote: window.__deletedRemote
    };
  });

  expect(result.deleted.id).toBe("img-a");
  expect(result.rows).toEqual([{ id: "img-b", is_primary: true }]);
  expect(result.deletedRemote).toEqual([`products/${KEY_A}.jpg`]);
});

test("repository leaves Supabase image rows untouched when R2 delete fails", async ({ page }) => {
  await installRepositoryHarness(page);

  const result = await page.evaluate(async () => {
    window.fetch = async (url, options = {}) => {
      if (options.method !== "DELETE") {
        throw new Error(`Unexpected fetch ${options.method || "GET"} ${url}`);
      }
      return new Response(JSON.stringify({ success: false, error: "delete failed" }), {
        status: 502,
        headers: { "Content-Type": "application/json" }
      });
    };

    window.__db.product_images.push(
      {
        id: "img-a",
        product_id: "product-1",
        object_key: `products/${KEY_A}.jpg`,
        sort_order: 0,
        is_primary: true,
        created_at: "2026-07-29T12:00:00Z"
      },
      {
        id: "img-b",
        product_id: "product-1",
        object_key: `products/${KEY_B}.jpg`,
        sort_order: 1,
        is_primary: false,
        created_at: "2026-07-29T12:00:01Z"
      }
    );

    try {
      await window.ProductImageRepository.deleteProductImage("img-a");
    } catch (error) {
      return {
        message: error.message,
        rows: window.__db.product_images.map((image) => ({
          id: image.id,
          is_primary: image.is_primary
        }))
      };
    }
    return null;
  });

  expect(result.message).toContain("delete failed");
  expect(result.rows).toEqual([
    { id: "img-a", is_primary: true },
    { id: "img-b", is_primary: false }
  ]);
});

test("repository changes the primary image without leaving multiple primaries", async ({ page }) => {
  await installRepositoryHarness(page);

  const result = await page.evaluate(async () => {
    window.__db.product_images.push(
      {
        id: "img-a",
        product_id: "product-1",
        object_key: `products/${KEY_A}.jpg`,
        sort_order: 0,
        is_primary: true,
        created_at: "2026-07-29T12:00:00Z"
      },
      {
        id: "img-b",
        product_id: "product-1",
        object_key: `products/${KEY_B}.jpg`,
        sort_order: 1,
        is_primary: false,
        created_at: "2026-07-29T12:00:01Z"
      }
    );

    const primary = await window.ProductImageRepository.setPrimaryImage("product-1", "img-b");
    return {
      primary,
      rows: window.__db.product_images.map((image) => ({
        id: image.id,
        is_primary: image.is_primary
      }))
    };
  });

  expect(result.primary.id).toBe("img-b");
  expect(result.rows).toEqual([
    { id: "img-a", is_primary: false },
    { id: "img-b", is_primary: true }
  ]);
});

test("repository updates image ordering by saved image id", async ({ page }) => {
  await installRepositoryHarness(page);

  const result = await page.evaluate(async () => {
    window.__db.product_images.push(
      {
        id: "img-a",
        product_id: "product-1",
        object_key: `products/${KEY_A}.jpg`,
        sort_order: 0,
        is_primary: true,
        created_at: "2026-07-29T12:00:00Z"
      },
      {
        id: "img-b",
        product_id: "product-1",
        object_key: `products/${KEY_B}.jpg`,
        sort_order: 1,
        is_primary: false,
        created_at: "2026-07-29T12:00:01Z"
      }
    );

    await window.ProductImageRepository.updateImageOrder("product-1", ["img-b", "img-a"]);
    return window.__db.product_images.map((image) => ({
      id: image.id,
      sort_order: image.sort_order
    }));
  });

  expect(result).toEqual([
    { id: "img-a", sort_order: 1 },
    { id: "img-b", sort_order: 0 }
  ]);
});

test("image upload helper sends real files with FormData and normalizes worker metadata", async ({ page }) => {
  await page.goto("about:blank");
  await page.evaluate((productId) => {
    window.APP_CONFIG = {
      UPLOAD_URL: "https://worker.example/upload",
      MEDIA_BASE_URL: "https://worker.example/media/",
      ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp", "image/avif"],
      MAX_IMAGE_BYTES: 10 * 1024 * 1024
    };
    window.AppConfig = {
      mediaUrl: (objectKey) => `https://worker.example/media/${objectKey}`
    };
    window.AdminAuth = {
      requireAdminSession: async () => ({ access_token: "token" })
    };
    window.__uploads = [];
    window.fetch = async (url, options = {}) => {
      const file = options.body.get("file");
      window.__uploads.push({
        url,
        method: options.method,
        token: options.headers.Authorization,
        productId: options.body.get("productId"),
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });
      const objectId = file.name === "one.webp"
        ? "22222222-2222-4222-8222-222222222222"
        : "33333333-3333-4333-8333-333333333333";
      return new Response(
        JSON.stringify({
          success: true,
          object_key: `products/${options.body.get("productId")}/${objectId}.${file.name.split(".").pop()}`,
          size_bytes: file.size,
          mime_type: file.type,
          original_file_name: file.name
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };
    window.__productId = productId;
  }, PRODUCT_ID);
  await page.addScriptTag({ path: repoPath("admin-js/image-upload.js") });

  const result = await page.evaluate(async () => {
    const files = [
      new File(["one"], "one.webp", { type: "image/webp" }),
      new File(["two-two"], "two.png", { type: "image/png" })
    ];
    const items = files.map((file, index) => ({
      clientId: `item-${index}`,
      file,
      originalName: file.name,
      contentType: file.type,
      sizeBytes: file.size,
      sortOrder: index,
      isPrimary: index === 0,
      status: "pending"
    }));

    const uploadResult = await window.ImageUpload.uploadPendingImages(
      items,
      window.__productId
    );

    return {
      uploaded: uploadResult.uploaded.map((image) => ({
        objectKey: image.objectKey,
        sizeBytes: image.sizeBytes,
        contentType: image.contentType,
        isPrimary: image.isPrimary
      })),
      failed: uploadResult.failed,
      requests: window.__uploads
    };
  });

  expect(result.failed).toEqual([]);
  expect(result.uploaded).toEqual([
    {
      objectKey: `products/${PRODUCT_ID}/22222222-2222-4222-8222-222222222222.webp`,
      sizeBytes: 3,
      contentType: "image/webp",
      isPrimary: true
    },
    {
      objectKey: `products/${PRODUCT_ID}/33333333-3333-4333-8333-333333333333.png`,
      sizeBytes: 7,
      contentType: "image/png",
      isPrimary: false
    }
  ]);
  expect(result.requests).toEqual([
    {
      url: "https://worker.example/upload",
      method: "POST",
      token: "Bearer token",
      productId: PRODUCT_ID,
      fileName: "one.webp",
      fileSize: 3,
      fileType: "image/webp"
    },
    {
      url: "https://worker.example/upload",
      method: "POST",
      token: "Bearer token",
      productId: PRODUCT_ID,
      fileName: "two.png",
      fileSize: 7,
      fileType: "image/png"
    }
  ]);
});

test("active code avoids legacy Netlify upload endpoint and root-relative asset links", async () => {
  const activeFiles = (await fs.readdir(process.cwd(), { recursive: true, withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath || entry.path, entry.name))
    .filter((filePath) => {
      const relative = path.relative(process.cwd(), filePath).replace(/\\/g, "/");
      return (
        !relative.startsWith("node_modules/") &&
        !relative.startsWith("docs/") &&
        !relative.startsWith("tests/") &&
        !relative.startsWith("test-results/") &&
        !relative.startsWith("supabase/") &&
        !relative.startsWith(".git/") &&
        /\.(html|js|css|mjs)$/.test(relative)
      );
    });

  const endpointMatches = [];
  const rootRelativeMatches = [];

  for (const filePath of activeFiles) {
    const relative = path.relative(process.cwd(), filePath).replace(/\\/g, "/");
    const text = await fs.readFile(filePath, "utf8");
    if (text.includes("/.netlify/functions/upload-image")) {
      endpointMatches.push(relative);
    }
    if (/(?:src|href)=["']\/(?!\/)/.test(text) || /fetch\(\s*["']\/(?!\/)/.test(text)) {
      rootRelativeMatches.push(relative);
    }
  }

  expect(endpointMatches).toEqual([]);
  expect(rootRelativeMatches).toEqual([]);
});
