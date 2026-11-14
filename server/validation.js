export class InputError extends Error {}
const fail = (message) => { throw new InputError(message); };
const text = (value, max = 10000) => typeof value === "string" && value.length <= max ? value.trim() : fail("Invalid text or text too long.");
const required = (v, name) => text(v, 250) || fail(`${name} is required.`);
const list = (v, fn) => Array.isArray(v) && v.length <= 100 ? v.map(fn) : fail("Invalid list (maximum 100 entries).");
const slug = (value) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) ? value : fail("URL slug must contain lowercase letters, numbers and hyphens.");
export function safeUrl(value) {
  const s = text(value || "", 2000);
  if (!s || /^\/api\/media\/[a-f0-9]{24}$/.test(s)) return s;
  try { if (new URL(s).protocol === "https:") return s; } catch { /* invalid URL */ }
  return fail("Use an HTTPS URL or an uploaded file.");
}
const object = (v) => v && typeof v === "object" && !Array.isArray(v) ? v : fail("Invalid object.");
const textMap = (v) => Object.fromEntries(Object.entries(object(v)).slice(0, 60).map(([k, val]) => {
  if (!/^[a-zA-Z0-9 _-]{1,100}$/.test(k) || ["__proto__", "constructor", "prototype"].includes(k)) fail("Invalid field name.");
  return [k, val == null ? null : text(val, 2000)];
}));
const lines = (v) => list(v || [], (s) => text(s, 1000));
export function validateProduct(input) {
  const p = object(input), c = object(p.content || {}), pack = object(c.packaging || {});
  return {
    title: required(p.title, "Product name"), num: required(p.num, "Product code"),
    slug: slug(required(p.slug, "Slug")), categoryId: required(p.categoryId, "Category"),
    featured: p.featured === true,
    seoTitle: text(p.seoTitle || "", 250), seoDescription: text(p.seoDescription || "", 500),
    content: {
      ...Object.fromEntries(["shortDescription", "overview", "botanicalSource", "manufacturing", "origin", "cultivation", "seasonality"].map(k => [k, text(c[k] || "")])),
      applications: lines(c.applications), specifications: textMap(c.specifications || {}),
      gallery: list(c.gallery || [], (v) => ({ src: safeUrl(v.src), alt: text(v.alt || "", 250), illustration: v.illustration === true })),
      documents: list(c.documents || [], (v) => ({ url: safeUrl(v.url), label: required(v.label, "Document label") })),
      faqs: list(c.faqs || [], v => ({ question: required(v.question, "Question"), answer: text(v.answer || "") })),
      packaging: { options: lines(pack.options), minimumOrder: text(pack.minimumOrder || "", 500), supplyDetails: text(pack.supplyDetails || "") },
    },
  };
}
export function validateCategory(input) {
  const c = object(input), content = object(c.content || {});
  return {
    category: required(c.category, "Category name"), slug: slug(required(c.slug, "Slug")),
    tag: text(c.tag || "", 100), desc: text(c.desc || ""), image: safeUrl(c.image),
    order: Number.isInteger(c.order) && c.order >= 0 ? c.order : 0,
    content: { ...Object.fromEntries(["summary", "overview", "sourcing", "materials", "methods"].map(k => [k, text(content[k] || "")])), applications: lines(content.applications) },
  };
}
export function validateSettings(input) {
  const s = object(input);
  const address = object(s.corporateAddress || {});
  const emails = list(s.emails, v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? text(v, 254) : fail("Invalid email address."));
  const phones = list(s.phones, v => /^\+\d{8,15}$/.test(v) ? v : fail("Use international phone format, e.g. +917017068468."));
  if (!emails.length || !phones.length) fail("At least one email and phone number are required.");
  return {
    name: required(s.name, "Company name"), emails: [...new Set(emails)], phones: [...new Set(phones)],
    whatsappNumber: /^\+\d{8,15}$/.test(s.whatsappNumber || phones[0]) ? s.whatsappNumber || phones[0] : fail("Invalid WhatsApp number."),
    streetAddress: text(s.streetAddress || ""), locality: text(s.locality || "", 250), region: text(s.region || "", 250),
    corporateAddress: Object.fromEntries(["streetAddress", "locality", "region", "postalCode"].map(k => [k, text(address[k] || "", 500)])),
    logo: safeUrl(s.logo), siteUrl: safeUrl(s.siteUrl), privacyUrl: safeUrl(s.privacyUrl), termsUrl: safeUrl(s.termsUrl),
    footerText: text(s.footerText || ""),
    socials: list(s.socials || [], v => ({ name: required(v.name, "Social name"), icon: ["facebook", "instagram", "linkedin"].includes(v.icon) ? v.icon : fail("Invalid social icon."), url: safeUrl(v.url) })).filter(v => v.url),
  };
}
