export function getContactEmails(env) {
  return [...new Set([
    env.VITE_CONTACT_EMAIL || "info@ayusharomatics.com",
    env.VITE_CONTACT_SECONDARY_EMAIL || "ayusharomatic@gmail.com",
  ].map((email) => email.trim()).filter(Boolean))];
}
