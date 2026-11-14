import { readFileSync } from "node:fs";
import { connectDatabase, createIndexes } from "./db.js";
import { hashPassword } from "./security.js";
import { business } from "../src/config/business.js";
import { categoryContent, createProductContent } from "../src/data/productContent.js";

let connection;
try {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD (12+ characters) in .env.local.");
  connection = await connectDatabase();
  const { db } = connection;
  const productIndexes = await db.collection("products").listIndexes().toArray().catch(() => []);
  if (productIndexes.some(index => index.name === "draft.slug_1")) await db.collection("products").dropIndex("draft.slug_1");
  await createIndexes(db);
  const catalogue = JSON.parse(readFileSync(new URL("../src/json/products.json", import.meta.url), "utf8"));
  const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const featured = new Set(["Menthol Crystals", "Mentha Arvensis Oil", "Lavender Oil", "Eucalyptus Essential Oil (Globulus)", "Spearmint Essential Oil", "Almond Oil"]);
  let count = 0;
  for (const [i, category] of catalogue.entries()) {
    const categoryId = `category-${i}`;
    const draft = { category: category.category, slug: slug(category.category), tag: category.tag || "", desc: category.desc || "", image: "", order: i, content: categoryContent[i] };
    await db.collection("categories").updateOne({ _id: categoryId }, { $setOnInsert: { draft, published: draft, version: 1, aliases: [], createdAt: new Date() } }, { upsert: true });
    for (const [j, product] of category.items.entries()) {
      const draft = { title: product.title, num: product.num, slug: slug(product.title), categoryId, featured: featured.has(product.title), seoTitle: "", seoDescription: "", content: createProductContent(product) };
      await db.collection("products").updateOne({ _id: `product-${product.num}` }, { $setOnInsert: { draft, published: draft, version: 1, legacyId: `c${i}-${j}`, aliases: [], createdAt: new Date() } }, { upsert: true });
      count++;
    }
  }
  await db.collection("settings").updateOne({ _id: "business" }, { $setOnInsert: { published: { ...business, footerText: "Essential oils, mint products and aromatic ingredients for your business. Start a conversation about your next bulk requirement.", whatsappNumber: business.phone }, version: 1 } }, { upsert: true });
  await db.collection("admins").updateOne({ email }, { $setOnInsert: { email, passwordHash: hashPassword(password), active: true, createdAt: new Date() } }, { upsert: true });
  console.log(`CRM setup complete: ${catalogue.length} categories, ${count} products. Existing records were preserved. Admin account is ready.`);
} catch (error) {
  console.error("CRM setup failed:", error.name, error.code || "", error.codeName || "", "Check environment configuration and Atlas IP access. No credentials are printed.");
  process.exitCode = 1;
} finally { await connection?.client.close(); }
