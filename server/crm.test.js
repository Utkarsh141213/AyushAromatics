import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { GridFSBucket } from "mongodb";
import { createApp } from "./app.js";
import { connectDatabase, createIndexes } from "./db.js";
import { hashPassword, verifyPassword } from "./security.js";
import { validateProduct, validateSettings, safeUrl } from "./validation.js";

test("password hashes and unsafe content validation", () => {
  const hash = hashPassword("test-password-strong");
  assert.ok(verifyPassword("test-password-strong", hash));
  assert.equal(verifyPassword("incorrect-password", hash), false);
  assert.equal(verifyPassword("anything", "invalid"), false);
  assert.throws(() => safeUrl("javascript:alert(1)"));
  assert.throws(() => safeUrl("//evil.example.com/image"));
  assert.throws(() => validateSettings({ emails: [], phones: [] }));
  assert.throws(() => validateProduct({ title: "", num: "X", slug: "x", categoryId: "one" }));
});

test("MongoDB-backed authentication, publishing, settings and uploads", { skip: !process.env.MONGODB_URI }, async t => {
  const connection = await connectDatabase();
  const prefix = `crm_test_${randomUUID().replaceAll("-", "")}_`;
  const collections = new Set();
  const db = {
    collection(name) { collections.add(`${prefix}${name}`); return connection.db.collection(`${prefix}${name}`); },
    command: command => connection.db.command(command),
  };
  const bucketName = `${prefix}media`;
  const bucket = new GridFSBucket(connection.db, { bucketName });
  // The app's media lookup uses media.files. Map only that name to the test bucket.
  const originalCollection = db.collection;
  db.collection = name => name === "media.files" ? connection.db.collection(`${bucketName}.files`) : originalCollection(name);
  const previousOrigin = process.env.APP_ORIGIN;
  process.env.APP_ORIGIN = "http://localhost:5173";
  const app = createApp({ db, bucket });
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  let cookie = "";
  const request = async (path, method = "GET", data, authenticated = true, origin = "http://localhost:5173") => {
    const response = await fetch(base + path, { method, headers: { Origin: origin, ...(authenticated && cookie ? { Cookie: cookie } : {}), ...(data && !(data instanceof FormData) ? { "Content-Type": "application/json" } : {}) }, body: data ? data instanceof FormData ? data : JSON.stringify(data) : undefined });
    const result = await response.json().catch(() => null);
    return { status: response.status, result, response };
  };
  try {
    await createIndexes(db);
    await db.collection("admins").insertOne({ email: "test@example.com", passwordHash: hashPassword("initial-test-password"), active: true });
    await db.collection("settings").insertOne({ _id: "business", version: 1, published: { name: "Test", emails: ["test@example.com"], phones: ["+917017068468"] } });
    await t.test("anonymous writes, CSRF and bad login are blocked", async () => {
      assert.equal((await request("/admin/data", "GET", null, false)).status, 401);
      assert.equal((await request("/auth/login", "POST", { email: "test@example.com", password: "wrong" })).status, 401);
      assert.equal((await request("/auth/login", "POST", { email: "test@example.com", password: "initial-test-password" }, false, "https://evil.example.com")).status, 403);
      const login = await request("/auth/login", "POST", { email: "test@example.com", password: "initial-test-password" });
      assert.equal(login.status, 200);
      cookie = login.response.headers.get("set-cookie").split(";")[0];
      assert.ok(login.response.headers.get("set-cookie").includes("HttpOnly"));
      assert.equal((await request("/auth/me")).result.email, "test@example.com");
    });
    let categoryId, productId;
    const category = { category: "Test oils", slug: "test-oils", content: {} };
    await t.test("category drafts are private and publication is explicit", async () => {
      const create = await request("/admin/categories/new", "PUT", { data: category, publish: false });
      assert.equal(create.status, 200); categoryId = create.result.id;
      assert.equal((await request("/content")).result.categories.length, 0);
      assert.equal((await request(`/admin/categories/${categoryId}`, "PUT", { data: category, version: 1, publish: true })).status, 200);
      assert.equal((await request("/content")).result.categories.length, 1);
    });
    const product = { title: "Test oil", num: "TEST-001", slug: "test-oil", categoryId: "", content: { overview: "Original overview", specifications: { Purity: "99%" } } };
    await t.test("product publish, independent drafts and optimistic locking", async () => {
      product.categoryId = categoryId;
      const create = await request("/admin/products/new", "PUT", { data: product, publish: true });
      assert.equal(create.status, 200); productId = create.result.id;
      const draft = structuredClone(product); draft.content.overview = "Unpublished update";
      assert.equal((await request(`/admin/products/${productId}`, "PUT", { data: draft, version: 1, publish: false })).status, 200);
      assert.equal((await request("/content")).result.products[0].content.overview, "Original overview");
      assert.equal((await request(`/admin/products/${productId}`, "PUT", { data: draft, version: 1, publish: true })).status, 409);
      assert.equal((await request(`/admin/products/${productId}`, "PUT", { data: draft, version: 2, publish: true })).status, 200);
      assert.equal((await request("/content")).result.products[0].content.overview, "Unpublished update");
      assert.equal((await request("/content")).result.products[0].content.specifications.Purity, "99%");
      assert.equal((await request("/admin/products/new", "PUT", { data: product, publish: true })).status, 409);
      assert.equal((await request(`/admin/categories/${categoryId}/archive`, "POST", { version: 2 })).status, 400);
    });
    await t.test("settings validation and public contact updates", async () => {
      const settings = { name: "Test Company", emails: ["test@example.com", "other@example.com"], phones: ["+917017068468", "+918267000606"], corporateAddress: { postalCode: "400615" } };
      assert.equal((await request("/admin/settings", "PUT", { data: settings, version: 1 })).status, 200);
      assert.deepEqual((await request("/content")).result.settings.emails, settings.emails);
      assert.equal((await request("/admin/settings", "PUT", { data: { ...settings, emails: ["bad"] }, version: 2 })).status, 400);
    });
    await t.test("renamed product URLs retain their previous path", async () => {
      const next = { ...product, slug: "renamed-test-oil" };
      assert.equal((await request(`/admin/products/${productId}`, "PUT", { data: next, version: 3, publish: true })).status, 200);
      const published = (await request("/content")).result.products[0];
      assert.ok(published.aliases.includes("test-oil"));
      assert.ok(published.pathAliases.includes("test-oils/test-oil"));
    });
    await t.test("file signatures are validated and GridFS uploads persist", async () => {
      const invalid = new FormData(); invalid.append("file", new Blob(["<svg></svg>"], { type: "image/png" }), "fake.png");
      assert.equal((await request("/admin/media", "POST", invalid)).status, 400);
      const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64");
      const form = new FormData(); form.append("file", new Blob([png], { type: "image/png" }), "test.png");
      const result = await request("/admin/media", "POST", form);
      assert.equal(result.status, 200);
      const download = await fetch(base.replace(/\/api$/, "") + result.result.url);
      assert.equal(download.headers.get("content-type"), "image/png");
      assert.deepEqual(Buffer.from(await download.arrayBuffer()), png);
    });
    await t.test("unpublish preserves draft and password change revokes sessions", async () => {
      assert.equal((await request(`/admin/products/${productId}/archive`, "POST", { version: 4 })).status, 200);
      assert.equal((await request("/content")).result.products.length, 0);
      assert.equal((await request("/admin/data")).result.products.length, 1);
      assert.equal((await request("/auth/password", "POST", { currentPassword: "initial-test-password", password: "changed-test-password" })).status, 200);
      assert.equal((await request("/auth/me")).status, 401);
    });
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    if (previousOrigin === undefined) delete process.env.APP_ORIGIN; else process.env.APP_ORIGIN = previousOrigin;
    for (const name of [...collections, `${bucketName}.files`, `${bucketName}.chunks`]) await connection.db.collection(name).drop().catch(() => {});
    await connection.client.close();
  }
});
