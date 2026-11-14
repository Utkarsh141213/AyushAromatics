import { useEffect, useRef, useState } from "react";
import { api, refreshContent } from "../services/crm";
import { business } from "../config/business";
import { categories, slugify } from "../data/catalogue";
import { createProductContent, specificationFields } from "../data/productContent";
import ProductDetail from "../sections/ProductDetail";
import QuoteProvider from "../components/QuoteProvider";
import "./admin.css";

const clone = value => structuredClone(value);
const cleanLines = list => (list || []).map(s => s.trim()).filter(Boolean);
function Field({ label, value, onChange, area = false, ...props }) {
  const Input = area ? "textarea" : "input";
  return <label className={`crm-field ${area ? "crm-wide" : ""}`}><span>{label}</span><Input value={value ?? ""} onChange={e => onChange(e.target.value)} rows={area ? 4 : undefined} {...props} /></label>;
}
function Lines({ label, value, onChange }) {
  return <Field label={`${label} (one per line)`} value={(value || []).join("\n")} onChange={v => onChange(v.split("\n"))} area />;
}
function Upload({ label, accept, onUpload, onError }) {
  const [busy, setBusy] = useState(false);
  return <label className="crm-upload">{busy ? "Uploading…" : label}<input type="file" accept={accept} disabled={busy} onChange={async e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { onError("Maximum upload size is 8 MB."); e.target.value = ""; return; }
    setBusy(true);
    try {
      const data = new FormData(); data.append("file", file);
      const result = await api("/admin/media", { method: "POST", data });
      if (accept === "image/*" && !result.type.startsWith("image/")) throw new Error("Choose a JPEG, PNG or WebP image.");
      onUpload(result);
    } catch (err) { onError(err.message); } finally { setBusy(false); e.target.value = ""; }
  }} /></label>;
}
function ProductForm({ value: p, onChange, categoryRecords, onError }) {
  const c = p.content;
  const set = (key, value) => onChange({ ...p, [key]: value });
  const content = (key, value) => onChange({ ...p, content: { ...c, [key]: value } });
  const updateItem = (key, i, item) => content(key, c[key].map((v, j) => j === i ? item : v));
  const [customName, setCustomName] = useState("");
  return <>
    <section className="crm-card"><h2>Product details</h2><div className="crm-fields">
      <Field label="Product name *" value={p.title} onChange={v => onChange({ ...p, title: v, slug: p.slug === slugify(p.title) ? slugify(v) : p.slug })} required />
      <Field label="Catalogue code *" value={p.num} onChange={v => set("num", v)} required />
      <label className="crm-field"><span>Category *</span><select value={p.categoryId} required onChange={e => set("categoryId", e.target.value)}><option value="">Select category</option>{categoryRecords.map(r => <option key={r._id} value={r._id}>{r.draft.category}{!r.published ? " (unpublished)" : ""}</option>)}</select></label>
      <Field label="URL slug *" value={p.slug} onChange={v => set("slug", v)} required pattern="[a-z0-9]+(-[a-z0-9]+)*" />
      <label className="crm-check"><input type="checkbox" checked={p.featured} onChange={e => set("featured", e.target.checked)} /> Feature on homepage</label>
      <Field label="Short description" value={c.shortDescription} onChange={v => content("shortDescription", v)} area />
      <Field label="Detailed overview" value={c.overview} onChange={v => content("overview", v)} area />
    </div></section>
    <section className="crm-card"><h2>Images</h2><p>First image is the main product image. JPEG, PNG or WebP, up to 8 MB each.</p>
      <Upload label="+ Upload image" accept="image/*" onError={onError} onUpload={r => content("gallery", [...c.gallery, { src: r.url, alt: p.title, illustration: false }])} />
      <div className="crm-gallery">{c.gallery.map((image, i) => <div className="crm-image" key={`${image.src}-${i}`}>
        <img src={image.src} alt={image.alt || "Product"} /><span className="crm-pill">{i === 0 ? "Main image" : `Image ${i + 1}`}</span>
        <Field label="Alt text" value={image.alt} onChange={v => updateItem("gallery", i, { ...image, alt: v })} />
        <div className="crm-row"><button type="button" disabled={i === 0} onClick={() => { const a = [...c.gallery]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; content("gallery", a); }}>Move earlier</button><button type="button" onClick={() => content("gallery", c.gallery.filter((_, j) => j !== i))}>Remove</button></div>
      </div>)}</div>
      {!c.gallery.length && <p className="crm-muted">No product image yet. The category image will be used.</p>}
    </section>
    <section className="crm-card"><h2>Source & applications</h2><div className="crm-fields">
      {[["botanicalSource", "Botanical source"], ["manufacturing", "Manufacturing & extraction"], ["origin", "Origin"], ["cultivation", "Cultivation"], ["seasonality", "Seasonality"]].map(([key, label]) => <Field key={key} label={label} value={c[key]} onChange={v => content(key, v)} area />)}
      <Lines label="Applications" value={c.applications} onChange={v => content("applications", v)} />
    </div></section>
    <section className="crm-card"><h2>Technical specifications</h2><div className="crm-fields">
      {Object.entries(c.specifications).map(([key, val]) => <Field key={key} label={specificationFields.find(([k]) => k === key)?.[1] || key} value={val} onChange={v => content("specifications", { ...c.specifications, [key]: v })} />)}
    </div><div className="crm-row"><Field label="Custom specification name" value={customName} onChange={setCustomName} /><button type="button" onClick={() => { const key = customName.trim(); if (!/^[a-zA-Z0-9 _-]{1,100}$/.test(key) || ["__proto__", "constructor", "prototype"].includes(key)) return onError("Use letters, numbers, spaces or hyphens for the field name."); content("specifications", { ...c.specifications, [key]: c.specifications[key] || "" }); setCustomName(""); }}>Add field</button></div></section>
    <section className="crm-card"><h2>Packaging & supply</h2><div className="crm-fields">
      <Lines label="Packaging options" value={c.packaging.options} onChange={v => content("packaging", { ...c.packaging, options: v })} />
      <Field label="Minimum order" value={c.packaging.minimumOrder} onChange={v => content("packaging", { ...c.packaging, minimumOrder: v })} />
      <Field label="Supply details" value={c.packaging.supplyDetails} onChange={v => content("packaging", { ...c.packaging, supplyDetails: v })} area />
    </div></section>
    <section className="crm-card"><h2>Documents</h2><Upload label="+ Upload PDF" accept="application/pdf" onError={onError} onUpload={r => { if (r.type !== "application/pdf") return onError("Choose a PDF document."); content("documents", [...c.documents, { url: r.url, label: r.name }]); }} />
      {c.documents.map((doc, i) => <div className="crm-row" key={`${doc.url}-${i}`}><Field label="Document label" value={doc.label} onChange={v => updateItem("documents", i, { ...doc, label: v })} /><a href={doc.url} target="_blank" rel="noreferrer">Open</a><button type="button" onClick={() => content("documents", c.documents.filter((_, j) => j !== i))}>Remove</button></div>)}
    </section>
    <section className="crm-card"><h2>Buyer FAQs</h2>{c.faqs.map((faq, i) => <div className="crm-repeat" key={i}><Field label="Question" value={faq.question} onChange={v => updateItem("faqs", i, { ...faq, question: v })} /><Field label="Answer" value={faq.answer} onChange={v => updateItem("faqs", i, { ...faq, answer: v })} area /><button type="button" onClick={() => content("faqs", c.faqs.filter((_, j) => j !== i))}>Remove FAQ</button></div>)}<button type="button" onClick={() => content("faqs", [...c.faqs, { question: "", answer: "" }])}>+ Add FAQ</button></section>
    <section className="crm-card"><h2>Search appearance</h2><div className="crm-fields"><Field label="SEO title" value={p.seoTitle} onChange={v => set("seoTitle", v)} /><Field label="SEO description" value={p.seoDescription} onChange={v => set("seoDescription", v)} area /></div></section>
  </>;
}

function CategoryForm({ value: c, onChange, products, onProduct, onError }) {
  const set = (key, value) => onChange({ ...c, [key]: value });
  return <>
    <section className="crm-card"><h2>Category details</h2><div className="crm-fields">
      <Field label="Category name *" value={c.category} required onChange={v => onChange({ ...c, category: v, slug: c.slug === slugify(c.category) ? slugify(v) : c.slug })} />
      <Field label="URL slug *" value={c.slug} required onChange={v => set("slug", v)} />
      <Field label="Tag" value={c.tag} onChange={v => set("tag", v)} />
      <Field label="Display order" type="number" min="0" value={c.order} onChange={v => set("order", Number(v))} />
      <Field label="Description" value={c.desc} area onChange={v => set("desc", v)} />
    </div><Upload label="Upload category image" accept="image/*" onError={onError} onUpload={r => set("image", r.url)} />{c.image && <div className="crm-category-image"><img src={c.image} alt={c.category} /><button type="button" onClick={() => set("image", "")}>Remove image</button></div>}</section>
    <section className="crm-card"><h2>Category page content</h2><div className="crm-fields">{[["summary", "Summary"], ["overview", "Overview"], ["sourcing", "Sourcing"], ["materials", "Materials"], ["methods", "Processing methods"]].map(([key, label]) => <Field key={key} label={label} value={c.content[key]} area onChange={v => set("content", { ...c.content, [key]: v })} />)}<Lines label="Applications" value={c.content.applications} onChange={v => set("content", { ...c.content, applications: v })} /></div></section>
    <section className="crm-card"><h2>Products in this category <span className="crm-pill">{products.length}</span></h2>{products.length ? <div className="crm-category-products">{products.map(p => <button type="button" key={p._id} onClick={() => onProduct(p)}><span>{p.draft.title}</span><small>{p.draft.num} · {p.published ? "Published" : "Draft"}</small><span>Open →</span></button>)}</div> : <p>No products assigned yet. Add a product and select this category.</p>}</section>
  </>;
}

function SettingsForm({ value: s, onChange, onError }) {
  const set = (key, value) => onChange({ ...s, [key]: value });
  return <>
    <section className="crm-card"><h2>Company & contact</h2><p>The first email and phone are the primary contacts. All contacts appear across the website.</p><div className="crm-fields">
      <Field label="Company name *" value={s.name} required onChange={v => set("name", v)} />
      <Field label="Website URL" value={s.siteUrl} onChange={v => set("siteUrl", v)} />
      <Lines label="Email addresses" value={s.emails} onChange={v => set("emails", v)} />
      <Lines label="Phone numbers (include +country code)" value={s.phones} onChange={v => set("phones", v)} />
      <Field label="WhatsApp number" value={s.whatsappNumber || s.phones[0]} onChange={v => set("whatsappNumber", v)} />
      <Field label="Logo URL" value={s.logo} onChange={v => set("logo", v)} />
    </div><Upload label="Upload logo" accept="image/*" onError={onError} onUpload={r => set("logo", r.url)} /></section>
    <section className="crm-card"><h2>Main address</h2><div className="crm-fields">{[["streetAddress", "Street address"], ["locality", "City / locality"], ["region", "State"]].map(([key, label]) => <Field key={key} label={label} value={s[key]} onChange={v => set(key, v)} />)}</div></section>
    <section className="crm-card"><h2>Corporate address</h2><div className="crm-fields">{[["streetAddress", "Street address"], ["locality", "City"], ["region", "State"], ["postalCode", "PIN code"]].map(([key, label]) => <Field key={key} label={label} value={s.corporateAddress[key]} onChange={v => set("corporateAddress", { ...s.corporateAddress, [key]: v })} />)}</div></section>
    <section className="crm-card"><h2>Social links & footer</h2><div className="crm-fields">{[["Facebook", "facebook"], ["Instagram", "instagram"], ["LinkedIn", "linkedin"]].map(([name, icon]) => <Field key={icon} label={`${name} URL`} value={s.socials.find(link => link.icon === icon)?.url || ""} onChange={v => set("socials", [...s.socials.filter(link => link.icon !== icon), { name, icon, url: v }])} />)}<Field label="Footer description" value={s.footerText} onChange={v => set("footerText", v)} area /><Field label="Privacy policy URL" value={s.privacyUrl} onChange={v => set("privacyUrl", v)} /><Field label="Terms URL" value={s.termsUrl} onChange={v => set("termsUrl", v)} /></div></section>
  </>;
}

function Preview({ product, category, onClose }) {
  const dialog = useRef(null);
  useEffect(() => { dialog.current.showModal(); }, []);
  const index = categories.findIndex(c => c.id === product.categoryId);
  const content = { ...createProductContent(product), ...product.content };
  const previewProduct = { ...product, id: "preview", category: category?.category || "Category", categoryIndex: index, categorySlug: category?.slug || "category", image: categories[index]?.image || business.logo, content, path: "#/admin" };
  return <dialog className="crm-preview" ref={dialog} onCancel={onClose}><div className="crm-preview-bar"><strong>Draft preview · {product.title}</strong><button onClick={onClose}>Close preview</button></div><QuoteProvider><ProductDetail product={previewProduct} /></QuoteProvider></dialog>;
}

export default function Admin() {
  const [user, setUser] = useState(undefined);
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("products");
  const [editor, setEditor] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState(false);
  const [login, setLogin] = useState({ email: "", password: "" });
  const [passwords, setPasswords] = useState({ currentPassword: "", password: "" });
  const reload = async () => { const next = await api("/admin/data"); setData(next); return next; };
  useEffect(() => {
    document.title = "Admin | Ayush Aromatics";
    const robots = document.createElement("meta"); robots.name = "robots"; robots.content = "noindex, nofollow"; document.head.append(robots);
    let active = true;
    api("/auth/me").then(async u => { const next = await api("/admin/data"); if (active) { setUser(u); setData(next); } }).catch(err => { if (active) { setUser(null); if (err.status !== 401) setError(err.message); } });
    return () => { active = false; robots.remove(); };
  }, []);
  useEffect(() => {
    const before = event => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [dirty]);
  function canLeave() { return !dirty || window.confirm("You have unsaved changes. Discard them?"); }
  function changeTab(next) {
    if (!canLeave()) return;
    window.scrollTo({ top: 0, behavior: "instant" });
    setTab(next); setSearch(""); setFilter(""); setEditor(next === "settings" ? { id: "business", version: data.settings.version, value: clone(data.settings.published) } : null); setDirty(false); setError(""); setNotice("");
  }
  function open(record, kind = tab) {
    if (!canLeave()) return;
    window.scrollTo({ top: 0, behavior: "instant" });
    setTab(kind); setEditor({ id: record._id, version: record.version, value: clone(record.draft), published: Boolean(record.published) }); setDirty(false); setError(""); setNotice("");
  }
  function add() {
    if (!canLeave()) return;
    window.scrollTo({ top: 0, behavior: "instant" });
    const value = tab === "products" ? { title: "", num: "", slug: "", categoryId: data.categories[0]?._id || "", featured: false, seoTitle: "", seoDescription: "", content: createProductContent({}) } : { category: "", slug: "", tag: "", desc: "", image: "", order: data.categories.length, content: { summary: "", overview: "", sourcing: "", materials: "", methods: "", applications: [] } };
    setEditor({ id: "new", version: 0, value }); setDirty(false); setNotice(""); setError("");
  }
  function update(value) { setEditor({ ...editor, value }); setDirty(true); }
  async function task(fn) {
    setBusy(true); setError(""); setNotice("");
    try { await fn(); } catch (err) { setError(err.message); if (err.status === 401) { setUser(null); setData(null); } } finally { setBusy(false); }
  }
  async function save(publish) {
    await task(async () => {
      const value = clone(editor.value);
      if (tab === "products") { value.content.applications = cleanLines(value.content.applications); value.content.packaging.options = cleanLines(value.content.packaging.options); }
      if (tab === "categories") value.content.applications = cleanLines(value.content.applications);
      if (tab === "settings") { value.emails = cleanLines(value.emails); value.phones = cleanLines(value.phones); }
      const result = await api(`/admin/${tab}${tab === "settings" ? "" : `/${editor.id}`}`, { method: "PUT", data: { data: value, version: editor.version, publish } });
      const next = await reload();
      if (tab === "settings") setEditor({ id: "business", version: next.settings.version, value: clone(next.settings.published) });
      else { const r = next[tab].find(r => r._id === result.id); setEditor({ id: r._id, version: r.version, value: clone(r.draft), published: Boolean(r.published) }); }
      setDirty(false);
      if (publish || tab === "settings") await refreshContent();
      setNotice(publish || tab === "settings" ? "Published. The website will show this content on its next load." : "Draft saved. Published content stays as it is until you publish.");
    });
  }
  const records = (Array.isArray(data?.[tab]) ? data[tab] : []).filter(r => (!search || `${r.draft.title || r.draft.category} ${r.draft.num || ""}`.toLowerCase().includes(search.toLowerCase())) && (!filter || r.draft.categoryId === filter) && (!statusFilter || (statusFilter === "published" ? r.published : !r.published)));
  return <div className="crm">
    {!user ? <main className="crm-login"><a className="crm-wordmark" href="#">A<span>AYUSH AROMATICS</span></a><div className="crm-card"><p className="crm-eyebrow">CATALOGUE MANAGEMENT</p><h1>Welcome back.</h1><p>Sign in to manage your products and website.</p>{error && <p className="crm-error" role="alert">{error}</p>}{user === undefined ? <p role="status">Checking session…</p> : <form onSubmit={e => { e.preventDefault(); task(async () => { const u = await api("/auth/login", { method: "POST", data: login }); setUser(u); setLogin({ email: "", password: "" }); await reload(); }); }}><Field label="Admin email" type="email" autoComplete="username" required value={login.email} onChange={v => setLogin({ ...login, email: v })} /><Field label="Password" type="password" autoComplete="current-password" required value={login.password} onChange={v => setLogin({ ...login, password: v })} /><button className="crm-primary" disabled={busy}>{busy ? "Signing in…" : "Sign in →"}</button></form>}</div><a href="#">← Back to website</a></main> : <>
      <aside className="crm-sidebar"><a className="crm-wordmark" href="#" onClick={e => { if (!canLeave()) e.preventDefault(); }}>A<span>AYUSH AROMATICS<small>Admin workspace</small></span></a><nav aria-label="Admin navigation">{[["products", "Products", "01"], ["categories", "Categories", "02"], ["settings", "General settings", "03"], ["account", "Account", "04"]].map(([key, label, number]) => <button key={key} className={tab === key ? "is-active" : ""} disabled={busy} onClick={() => changeTab(key)}><span>{number}</span>{label}{data?.[key] && <small>{data[key].length}</small>}</button>)}</nav><div className="crm-sidebar-bottom"><a href="#" onClick={e => { if (!canLeave()) e.preventDefault(); }}>View website ↗</a><p>{user.email}</p><button disabled={busy} onClick={() => { if (canLeave()) task(async () => { await api("/auth/logout", { method: "POST" }); setUser(null); setData(null); setEditor(null); setDirty(false); }); }}>Sign out</button></div></aside>
      <main className="crm-main"><header className="crm-header"><div><p className="crm-eyebrow">YOUR WEBSITE, IN YOUR HANDS</p><h1>{({ products: "Products", categories: "Categories", settings: "General settings", account: "Your account" })[tab]}</h1><p>{tab === "products" ? "Keep every ingredient accurate, complete and ready for buyers." : tab === "categories" ? "Organize your catalogue and shape each collection." : tab === "settings" ? "One place for your company identity and contact information." : "Manage your admin password."}</p></div>{["products", "categories"].includes(tab) && <button className="crm-primary" disabled={busy} onClick={add}>+ Add {tab === "products" ? "product" : "category"}</button>}</header>
      {!data ? <p role="status">Loading workspace…</p> : <>
        {error && <div role="alert" className="crm-error">{error}<button onClick={() => setError("")}>Dismiss</button></div>}{notice && <div role="status" className="crm-success">{notice}</div>}
        {tab === "account" ? <form className="crm-card crm-account" onSubmit={e => { e.preventDefault(); task(async () => { await api("/auth/password", { method: "POST", data: passwords }); setPasswords({ currentPassword: "", password: "" }); setDirty(false); setUser(null); setData(null); setNotice("Password changed. Sign in again."); }); }}><h2>Change password</h2><Field label="Current password" type="password" autoComplete="current-password" required value={passwords.currentPassword} onChange={v => setPasswords({ ...passwords, currentPassword: v })} /><Field label="New password (12+ characters)" type="password" autoComplete="new-password" minLength={12} required value={passwords.password} onChange={v => setPasswords({ ...passwords, password: v })} /><button className="crm-primary" disabled={busy}>Update password</button></form> : <>
          {tab !== "settings" && <section className="crm-stats"><div><strong>{data[tab].length}</strong><span>Total {tab}</span></div><div><strong>{data[tab].filter(r => r.published).length}</strong><span>Published</span></div><div><strong>{data[tab].filter(r => !r.published).length}</strong><span>Draft / archived</span></div></section>}
          <div className={`crm-workspace ${tab === "settings" ? "crm-settings" : ""}`}>
            {tab !== "settings" && <section className="crm-list"><div className="crm-list-filters"><input aria-label={`Search ${tab}`} placeholder={`Search ${tab}…`} value={search} onChange={e => setSearch(e.target.value)} />{tab === "products" && <select aria-label="Filter by category" value={filter} onChange={e => setFilter(e.target.value)}><option value="">All categories</option>{data.categories.map(c => <option key={c._id} value={c._id}>{c.draft.category}</option>)}</select>}<select aria-label="Filter by status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="">All statuses</option><option value="published">Published</option><option value="draft">Draft / archived</option></select></div><div className="crm-records">{records.map(r => <button key={r._id} disabled={busy} className={`crm-record ${editor?.id === r._id ? "is-selected" : ""}`} onClick={() => open(r)}><span><strong>{r.draft.title || r.draft.category}</strong><small>{tab === "products" ? `${r.draft.num} · ${data.categories.find(c => c._id === r.draft.categoryId)?.draft.category || "Unassigned"}` : `${data.products.filter(p => p.draft.categoryId === r._id).length} products`}</small></span><span className={`crm-pill ${r.published ? "crm-live" : ""}`}>{r.published ? "Published" : "Draft"}</span></button>)}{!records.length && <p className="crm-empty">No matching {tab}.</p>}</div></section>}
            {editor ? <form className="crm-editor" onSubmit={e => { e.preventDefault(); save(true); }}><div className="crm-editor-bar"><div><h2>{editor.id === "new" ? `New ${tab === "products" ? "product" : "category"}` : tab === "settings" ? "Website settings" : editor.value.title || editor.value.category}</h2><span className="crm-muted">{dirty ? "Unsaved changes" : "All changes saved"}</span></div><div className="crm-row">{tab === "products" && <button type="button" onClick={() => setPreview(true)}>Preview</button>}{tab !== "settings" && <button type="button" disabled={busy} onClick={() => save(false)}>Save draft</button>}<button className="crm-primary" disabled={busy}>{busy ? "Saving…" : tab === "settings" ? "Save settings" : "Publish"}</button></div></div>
              <fieldset disabled={busy}>{tab === "products" ? <ProductForm value={editor.value} onChange={update} categoryRecords={data.categories} onError={setError} /> : tab === "categories" ? <CategoryForm value={editor.value} onChange={update} products={data.products.filter(p => p.draft.categoryId === editor.id)} onProduct={r => open(r, "products")} onError={setError} /> : <SettingsForm value={editor.value} onChange={update} onError={setError} />}</fieldset>
              {tab !== "settings" && editor.published && <section className="crm-card crm-archive"><div><h2>Unpublish this {tab === "products" ? "product" : "category"}</h2><p>Remove it from the public website and keep its editable draft.</p></div><button type="button" disabled={busy} onClick={() => { if (window.confirm("Unpublish this record from the website?")) task(async () => { await api(`/admin/${tab}/${editor.id}/archive`, { method: "POST", data: { version: editor.version } }); const next = await reload(); const record = next[tab].find(r => r._id === editor.id); setEditor({ id: record._id, version: record.version, value: clone(record.draft), published: false }); setDirty(false); await refreshContent(); setNotice("Unpublished. Draft preserved."); }); }}>Unpublish</button></section>}
            </form> : <div className="crm-card crm-empty-editor"><span>✳</span><h2>Select a {tab === "products" ? "product" : "category"}</h2><p>Choose an item from the list to edit its details, or add something new.</p></div>}
          </div>
        </>}
      </>}
      </main>
    </>}
    {preview && <Preview product={editor.value} category={data.categories.find(c => c._id === editor.value.categoryId)?.draft} onClose={() => setPreview(false)} />}
  </div>;
}
