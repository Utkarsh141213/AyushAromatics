import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import multer from "multer";
import { ObjectId } from "mongodb";
import { randomUUID } from "node:crypto";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { hashPassword, verifyPassword, tokenHash, newToken } from "./security.js";
import { InputError, validateProduct, validateCategory, validateSettings } from "./validation.js";

export function createApp({ db, bucket, production = false }) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(helmet({ contentSecurityPolicy: { directives: {
    defaultSrc: ["'self'"], scriptSrc: ["'self'", "'unsafe-inline'"], styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "https:", "data:", "blob:"], connectSrc: ["'self'", "https://api.emailjs.com"],
  } }, crossOriginResourcePolicy: { policy: "same-origin" } }));
  app.use("/api", express.json({ limit: "1mb" }));
  app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      const origin = req.get("origin");
      const expected = process.env.APP_ORIGIN || `${req.protocol}://${req.get("host")}`;
      if (!origin || origin !== expected) return res.status(403).json({ error: "Request origin is not allowed." });
    }
    next();
  });
  const sessionCookie = (value, clear = false) => `ayush_session=${value}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=${clear ? 0 : 28800}${production ? "; Secure" : ""}`;
  const getToken = req => /(?:^|;\s*)ayush_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || "")?.[1];
  async function requireAdmin(req, res, next) {
    const token = getToken(req);
    const session = token && await db.collection("sessions").findOne({ token: tokenHash(token), expiresAt: { $gt: new Date() } });
    const admin = session && await db.collection("admins").findOne({ _id: session.adminId, active: true });
    if (!admin) return res.status(401).json({ error: "Please sign in again." });
    req.admin = admin;
    req.session = session;
    next();
  }
  app.get("/api/health", async (req, res) => {
    await db.command({ ping: 1 });
    res.json({ status: "ok" });
  });
  app.get("/api/content", async (req, res) => {
    const [categories, products, settings] = await Promise.all([
      db.collection("categories").find({ published: { $ne: null } }).toArray(),
      db.collection("products").find({ published: { $ne: null } }).toArray(),
      db.collection("settings").findOne({ _id: "business" }),
    ]);
    const publicCategories = categories.map(c => ({ ...c.published, id: c._id, aliases: c.aliases || [] })).sort((a, b) => a.order - b.order);
    const ids = new Set(publicCategories.map(c => c.id));
    res.json({
      categories: publicCategories,
      products: products.filter(p => ids.has(p.published.categoryId)).map(p => ({ ...p.published, id: p._id, aliases: p.aliases || [], pathAliases: p.pathAliases || [], legacyId: p.legacyId })),
      settings: settings?.published || null,
    });
  });
  const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false, message: { error: "Too many login attempts. Try again after 15 minutes." } });
  const dummyHash = hashPassword(newToken());
  app.post("/api/auth/login", loginLimit, async (req, res) => {
    const { email, password } = req.body || {};
    if (typeof email !== "string" || typeof password !== "string" || password.length > 256) throw new InputError("Enter email and password.");
    const admin = await db.collection("admins").findOne({ email: email.trim().toLowerCase(), active: true });
    const valid = verifyPassword(password, admin?.passwordHash || dummyHash);
    if (!admin || !valid) return res.status(401).json({ error: "Incorrect email or password." });
    const token = newToken();
    await db.collection("sessions").insertOne({ token: tokenHash(token), adminId: admin._id, expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000) });
    res.set("Set-Cookie", sessionCookie(token)).json({ email: admin.email });
  });
  app.get("/api/auth/me", requireAdmin, (req, res) => res.json({ email: req.admin.email }));
  app.post("/api/auth/logout", requireAdmin, async (req, res) => {
    await db.collection("sessions").deleteOne({ _id: req.session._id });
    res.set("Set-Cookie", sessionCookie("", true)).json({ ok: true });
  });
  app.post("/api/auth/password", requireAdmin, loginLimit, async (req, res) => {
    const { currentPassword, password } = req.body || {};
    if (typeof currentPassword !== "string" || currentPassword.length > 256 || typeof password !== "string" || password.length < 12 || password.length > 128) throw new InputError("Use a new password with 12–128 characters.");
    if (!verifyPassword(currentPassword, req.admin.passwordHash)) return res.status(400).json({ error: "Current password is incorrect." });
    await db.collection("admins").updateOne({ _id: req.admin._id }, { $set: { passwordHash: hashPassword(password) } });
    await db.collection("sessions").deleteMany({ adminId: req.admin._id });
    res.set("Set-Cookie", sessionCookie("", true)).json({ ok: true });
  });
  app.use("/api/admin", requireAdmin);
  app.get("/api/admin/data", async (req, res) => {
    const [products, categories, settings] = await Promise.all([
      db.collection("products").find().sort({ "draft.title": 1 }).toArray(),
      db.collection("categories").find().sort({ "draft.order": 1 }).toArray(),
      db.collection("settings").findOne({ _id: "business" }),
    ]);
    res.json({ products, categories, settings });
  });
  function writeRoute(type, validate) {
    app.put(`/api/admin/${type}/:id`, async (req, res) => {
      const id = req.params.id === "new" ? randomUUID() : req.params.id;
      const old = await db.collection(type).findOne({ _id: id });
      if (!old && req.params.id !== "new") return res.status(404).json({ error: "Record not found." });
      const draft = validate(req.body.data);
      if (type === "products" && !await db.collection("categories").findOne({ _id: draft.categoryId })) throw new InputError("Select an existing category.");
      const conflicts = type === "products" ? [
        { "published.num": draft.num }, { "draft.num": draft.num },
        { "published.categoryId": draft.categoryId, "published.slug": draft.slug },
        { "draft.categoryId": draft.categoryId, "draft.slug": draft.slug },
      ] : [{ "published.slug": draft.slug }, { "draft.slug": draft.slug }, { aliases: draft.slug }];
      if (await db.collection(type).findOne({ _id: { $ne: id }, $or: conflicts })) return res.status(409).json({ error: "This product code or URL is reserved by another record." });
      const version = old?.version || 0;
      if (old && req.body.version !== version) return res.status(409).json({ error: "This record changed in another tab. Reload it before saving." });
      const update = { draft, updatedAt: new Date(), updatedBy: req.admin.email, version: version + 1 };
      if (req.body.publish === true) {
        if (type === "products" && !await db.collection("categories").findOne({ _id: draft.categoryId, published: { $ne: null } })) throw new InputError("Publish the category before publishing its products.");
        update.published = draft;
        update.publishedAt = new Date();
        update.aliases = [...new Set([...(old?.aliases || []), old?.published?.slug].filter(Boolean))].filter(s => s !== draft.slug);
        if (type === "products" && old?.published) {
          const oldCategory = await db.collection("categories").findOne({ _id: old.published.categoryId });
          update.pathAliases = [...new Set([...(old.pathAliases || []), ...(oldCategory?.published ? [oldCategory.published.slug, ...(oldCategory.aliases || [])].map(slug => `${slug}/${old.published.slug}`) : [])])];
        }
      }
      if (old) {
        const result = await db.collection(type).updateOne({ _id: id, version }, { $set: update });
        if (!result.modifiedCount) return res.status(409).json({ error: "Record changed. Reload before saving." });
      } else await db.collection(type).insertOne({ _id: id, published: null, ...update });
      res.json({ id });
    });
    app.post(`/api/admin/${type}/:id/archive`, async (req, res) => {
      if (type === "categories" && await db.collection("products").findOne({ $or: [{ "published.categoryId": req.params.id }, { "draft.categoryId": req.params.id }] })) throw new InputError("Move or remove products from this category before archiving it.");
      const result = await db.collection(type).updateOne({ _id: req.params.id, version: req.body.version }, { $set: { published: null, updatedAt: new Date(), updatedBy: req.admin.email }, $inc: { version: 1 } });
      if (!result.modifiedCount) return res.status(409).json({ error: "Record changed or not found. Reload before archiving." });
      res.json({ ok: true });
    });
  }
  writeRoute("products", validateProduct);
  writeRoute("categories", validateCategory);
  app.put("/api/admin/settings", async (req, res) => {
    const settings = validateSettings(req.body.data);
    const result = await db.collection("settings").updateOne({ _id: "business", version: req.body.version }, { $set: { published: settings, updatedAt: new Date(), updatedBy: req.admin.email }, $inc: { version: 1 } });
    if (!result.modifiedCount) return res.status(409).json({ error: "Settings changed. Reload before saving." });
    res.json({ ok: true });
  });
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024, files: 1 } });
  app.post("/api/admin/media", upload.single("file"), async (req, res) => {
    const file = req.file;
    if (!file) throw new InputError("Choose a file.");
    const b = file.buffer;
    const type = b.subarray(0, 3).equals(Buffer.from([255, 216, 255])) ? "image/jpeg" :
      b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? "image/png" :
      b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP" ? "image/webp" :
      b.toString("ascii", 0, 5) === "%PDF-" ? "application/pdf" : null;
    if (!type) throw new InputError("Upload a JPEG, PNG, WebP image or PDF (maximum 8 MB).");
    const stream = bucket.openUploadStream(file.originalname.slice(0, 150), { metadata: { contentType: type, uploadedBy: req.admin.email, createdAt: new Date() } });
    await pipeline(Readable.from(b), stream);
    res.json({ url: `/api/media/${stream.id}`, type, name: file.originalname });
  });
  app.get("/api/media/:id", async (req, res) => {
    if (!/^[a-f0-9]{24}$/.test(req.params.id)) return res.sendStatus(404);
    const id = new ObjectId(req.params.id);
    const file = await db.collection("media.files").findOne({ _id: id });
    if (!file) return res.sendStatus(404);
    res.type(file.metadata.contentType).set("Cache-Control", "public, max-age=31536000, immutable");
    if (file.metadata.contentType === "application/pdf") res.set("Content-Disposition", "attachment; filename=document.pdf");
    await pipeline(bucket.openDownloadStream(id), res);
  });
  app.use("/api", (req, res) => res.status(404).json({ error: "API endpoint not found." }));
  const dist = resolve("dist");
  if (existsSync(resolve(dist, "index.html"))) {
    app.use(express.static(dist, { index: false }));
    app.get("/", (req, res) => res.set("Cache-Control", "no-cache").sendFile(resolve(dist, "index.html")));
  }
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = error instanceof InputError || error instanceof multer.MulterError || error.type === "entity.parse.failed" || error.type === "entity.too.large" ? 400 : error.code === 11000 ? 409 : 500;
    if (status === 500) console.error("API request failed:", error.name, error.code || "");
    res.status(status).json({ error: status === 400 ? error.message : status === 409 ? "Product code or URL slug is already in use." : "Server could not complete the request. Please try again." });
  });
  return app;
}
