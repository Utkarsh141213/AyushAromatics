import { applyCatalogue } from "../data/catalogue";
import { applyBusinessSettings } from "../config/business";

export async function api(path, { method = "GET", data, signal } = {}) {
  const isFile = data instanceof FormData;
  let response;
  try {
    response = await fetch(`/api${path}`, { method, credentials: "same-origin", signal,
      headers: data && !isFile ? { "Content-Type": "application/json" } : undefined,
      body: data ? isFile ? data : JSON.stringify(data) : undefined,
    });
  } catch { throw new Error("CRM server is unavailable. Check that the backend is running."); }
  const result = await response.json().catch(() => null);
  if (!response.ok || !result) {
    const error = new Error(result?.error || "CRM server is unavailable. Check that the backend is running.");
    error.status = response.status;
    throw error;
  }
  return result;
}
export async function refreshContent() {
  const data = await api("/content", { signal: AbortSignal.timeout(10000) });
  applyCatalogue(data);
  if (data.settings) applyBusinessSettings(data.settings);
}
