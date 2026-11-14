import { lazy, Suspense, useEffect, useState } from "react";
import App from "./App";
import QuoteProvider from "./components/QuoteProvider";
import { refreshContent } from "./services/crm";
const Admin = lazy(() => import("./admin/Admin"));

export default function Root() {
  const [admin, setAdmin] = useState(location.hash.startsWith("#/admin"));
  const [state, setState] = useState("loading");
  useEffect(() => {
    const change = () => setAdmin(location.hash.startsWith("#/admin"));
    window.addEventListener("hashchange", change);
    let active = true;
    refreshContent().then(() => { if (active) setState("ready"); }).catch(() => {
      if (active) setState(import.meta.env.VITE_CRM_REQUIRED === "true" ? "error" : "ready");
    });
    return () => { active = false; window.removeEventListener("hashchange", change); };
  }, []);
  if (admin) return <Suspense fallback={<div className="crm-loading">Opening admin…</div>}><Admin /></Suspense>;
  if (state === "loading") return <div className="crm-loading" role="status">Loading catalogue…</div>;
  if (state === "error") return <div className="crm-loading" role="alert"><h1>Catalogue temporarily unavailable</h1><p>Please try again in a moment.</p><button onClick={() => location.reload()}>Retry</button></div>;
  return <QuoteProvider><App /></QuoteProvider>;
}
