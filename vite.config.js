import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { getContactEmails } from "./src/config/emails.js";
import { getContactPhones, phoneLink } from "./src/config/phones.js";

export default defineConfig(({ mode }) => ({
  plugins: [react(), {
    name: "contact-email-fallback",
    transformIndexHtml(html) {
      const escapeHtml = (value) => value.replace(/[&<>"']/g, (char) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
      })[char]);
      const env = loadEnv(mode, "src");
      const links = getContactEmails(env).map((email) =>
        `<a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>`,
      ).join(" / ");
      const phones = getContactPhones(env).map((phone) =>
        `<a href="${escapeHtml(phoneLink(phone))}">${escapeHtml(phone)}</a>`,
      ).join(" / ");
      return html.replaceAll("<!-- CONTACT_EMAIL_LINKS -->", links)
        .replaceAll("<!-- CONTACT_PHONE_LINKS -->", phones);
    },
  }],

  // Root-relative deployment. Change to '/sub-path/' only if the site is
  // served from a subdirectory instead of the domain root.
  base: "/",
  envDir: "src",
  build: {
    target: "es2018",
    outDir: "dist",
    sourcemap: false, // don't ship source maps to a public production server
    minify: "esbuild",
    chunkSizeWarningLimit: 600,
  },

  server: {
    port: 5173,
    proxy: { "/api": "http://127.0.0.1:3001" },
  },

  preview: {
    port: 4173,
  },
}));
